// Testes de integração por contrato contra o banco real.
// Rodam apenas quando `DATABASE_URL` está disponível (dev); em CI sem DB são pulados silenciosamente.
use axum::body::Body;
use axum::http::{header, Method, Request, StatusCode};
use axum::Router;
use gestao_rust_api::build_app;
use gestao_rust_api::state::AppState;
use http_body_util::BodyExt;
use tower::ServiceExt;

fn database_url() -> Option<String> {
    std::env::var("DATABASE_URL")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

async fn app_or_skip() -> Option<Router> {
    database_url()?;
    match AppState::new_from_env().await {
        Ok(state) => Some(build_app(state)),
        Err(e) => {
            eprintln!("skipping contract tests: failed to connect: {e}");
            None
        }
    }
}

async fn send(
    app: &mut Router,
    method: Method,
    uri: &str,
    body: Option<serde_json::Value>,
    headers: &[(&str, &str)],
) -> (StatusCode, serde_json::Value) {
    let mut builder = Request::builder().method(method).uri(uri);
    for (key, value) in headers {
        builder = builder.header(*key, *value);
    }
    let request = match body {
        Some(json) => builder
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(json.to_string()))
            .unwrap(),
        None => builder.body(Body::empty()).unwrap(),
    };
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let value = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
    (status, value)
}

fn json_body(value: serde_json::Value) -> Option<serde_json::Value> {
    Some(value)
}

#[tokio::test]
async fn material_lists_crud_contract() {
    let Some(mut app) = app_or_skip().await else {
        return;
    };
    let state = AppState::new_from_env().await.unwrap();
    let pool = &state.db;

    let client_id: Option<String> =
        sqlx::query_scalar("SELECT id FROM clients ORDER BY \"createdAt\" LIMIT 1")
            .fetch_optional(pool)
            .await
            .unwrap();
    let Some(client_id) = client_id else {
        eprintln!("skipping material_lists_crud_contract: no client in database");
        return;
    };

    let headers = [("x-user-id", "contract-test")];
    let payload = serde_json::json!({
        "clientId": client_id,
        "title": "Teste contrato",
        "includePrices": true,
        "items": [
            { "name": "Tinta latex", "quantity": "2", "unit": "galao", "unitPrice": 120.5 },
            { "name": "Rolo de lã", "quantity": "1/2", "unit": "unidade", "unitPrice": 18.0 }
        ]
    });

    let (status, body) = send(
        &mut app,
        Method::POST,
        "/v2/material-lists",
        json_body(payload),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "create should return 201: {body}"
    );
    let list_id = body["id"]
        .as_str()
        .expect("create response should have id")
        .to_string();
    assert_eq!(body["clientId"].as_str(), Some(client_id.as_str()));
    assert_eq!(body["items"].as_array().map(Vec::len), Some(2));

    let (status, body) = send(
        &mut app,
        Method::GET,
        &format!("/v2/material-lists/{list_id}"),
        None,
        &headers,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"].as_str(), Some(list_id.as_str()));
    assert_eq!(body["title"].as_str(), Some("Teste contrato"));

    let (status, body) = send(
        &mut app,
        Method::PATCH,
        &format!("/v2/material-lists/{list_id}"),
        json_body(serde_json::json!({ "title": "Atualizado no contrato" })),
        &headers,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["title"].as_str(), Some("Atualizado no contrato"));

    let (status, _) = send(
        &mut app,
        Method::DELETE,
        &format!("/v2/material-lists/{list_id}"),
        None,
        &headers,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = send(
        &mut app,
        Method::GET,
        &format!("/v2/material-lists/{list_id}"),
        None,
        &headers,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND, "deleted list should 404");
}

#[tokio::test]
async fn expenses_idempotency_contract() {
    let Some(mut app) = app_or_skip().await else {
        return;
    };
    let state = AppState::new_from_env().await.unwrap();
    let pool = &state.db;

    let key = format!("contract-expense-{}", uuid::Uuid::new_v4());
    let headers = [
        ("x-user-id", "contract-test"),
        ("idempotency-key", key.as_str()),
    ];
    let payload = serde_json::json!({
        "category": "material",
        "description": "Despesa idempotente",
        "amount": 99.9,
        "date": "2026-08-01"
    });

    let (status, first) = send(
        &mut app,
        Method::POST,
        "/v2/expenses",
        json_body(payload.clone()),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "first create should return 201: {first}"
    );
    let expense_id = first["id"]
        .as_str()
        .expect("create should have id")
        .to_string();

    let (status, second) = send(
        &mut app,
        Method::POST,
        "/v2/expenses",
        json_body(payload),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "replay should return 201: {second}"
    );
    assert_eq!(
        second["id"].as_str(),
        Some(expense_id.as_str()),
        "replay must return the same resource"
    );

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM expenses WHERE id = $1")
        .bind(&expense_id)
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(count, 1, "retry must not duplicate the row");

    sqlx::query("DELETE FROM expenses WHERE id = $1")
        .bind(&expense_id)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM idempotency_keys WHERE \"key\" = $1")
        .bind(&key)
        .execute(pool)
        .await
        .unwrap();
}

#[tokio::test]
async fn payments_idempotency_contract() {
    let Some(mut app) = app_or_skip().await else {
        return;
    };
    let state = AppState::new_from_env().await.unwrap();
    let pool = &state.db;

    // Precisa de um orçamento com saldo >= 2 para que o pagamento de teste não zere o saldo
    // (evita mexer no flag de inadimplência do orçamento real).
    let quote: Option<(String, f64)> = sqlx::query_as(
        r#"SELECT q.id, q.total - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."quoteId" = q.id), 0)
             FROM quotes q
            WHERE q."userId" = ANY(SELECT id FROM users WHERE username = 'gustavo')
              AND q.total - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."quoteId" = q.id), 0) >= 2
            ORDER BY q."createdAt" DESC
            LIMIT 1"#,
    )
    .fetch_optional(pool)
    .await
    .unwrap();
    let Some((quote_id, _remaining)) = quote else {
        eprintln!("skipping payments_idempotency_contract: no quote with remaining >= 2");
        return;
    };

    let key = format!("contract-payment-{}", uuid::Uuid::new_v4());
    let headers = [
        ("x-user-id", "contract-test"),
        ("idempotency-key", key.as_str()),
    ];
    let payload = serde_json::json!({
        "quoteId": quote_id,
        "amount": 1.0,
        "paymentDate": "2026-08-01",
        "paymentMethod": "pix",
        "observations": "teste idempotencia"
    });

    let (status, first) = send(
        &mut app,
        Method::POST,
        "/v2/payments",
        json_body(payload.clone()),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "first create should return 201: {first}"
    );
    let payment_id = first["id"]
        .as_str()
        .expect("create should have id")
        .to_string();

    let (status, second) = send(
        &mut app,
        Method::POST,
        "/v2/payments",
        json_body(payload),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "replay should return 201: {second}"
    );
    assert_eq!(
        second["id"].as_str(),
        Some(payment_id.as_str()),
        "replay must return the same resource"
    );

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM payments WHERE id = $1")
        .bind(&payment_id)
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(count, 1, "retry must not duplicate the row");

    sqlx::query("DELETE FROM payments WHERE id = $1")
        .bind(&payment_id)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM idempotency_keys WHERE \"key\" = $1")
        .bind(&key)
        .execute(pool)
        .await
        .unwrap();
}

#[tokio::test]
async fn cash_closings_idempotency_contract() {
    let Some(mut app) = app_or_skip().await else {
        return;
    };
    let state = AppState::new_from_env().await.unwrap();
    let pool = &state.db;

    let key = format!("contract-closing-{}", uuid::Uuid::new_v4());
    let headers = [
        ("x-user-id", "contract-test"),
        ("idempotency-key", key.as_str()),
    ];
    let payload = serde_json::json!({
        "periodType": "semanal",
        "startDate": "2026-07-27",
        "endDate": "2026-08-02",
        "totalProfit": 1000.0,
        "companyCash": 100.0,
        "gustavoProfit": 900.0,
        "totalRevenue": 5000.0,
        "totalExpenses": 4000.0,
        "observations": "teste idempotencia"
    });

    let (status, first) = send(
        &mut app,
        Method::POST,
        "/v2/cash-closings",
        json_body(payload.clone()),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "first create should return 201: {first}"
    );
    let closing_id = first["id"]
        .as_str()
        .expect("create should have id")
        .to_string();

    let (status, second) = send(
        &mut app,
        Method::POST,
        "/v2/cash-closings",
        json_body(payload),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "replay should return 201: {second}"
    );
    assert_eq!(
        second["id"].as_str(),
        Some(closing_id.as_str()),
        "replay must return the same resource"
    );

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM cash_closings WHERE id = $1")
        .bind(&closing_id)
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(count, 1, "retry must not duplicate the row");

    sqlx::query("DELETE FROM cash_closings WHERE id = $1")
        .bind(&closing_id)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM idempotency_keys WHERE \"key\" = $1")
        .bind(&key)
        .execute(pool)
        .await
        .unwrap();
}

#[tokio::test]
async fn expenses_idempotency_conflict_contract() {
    let Some(mut app) = app_or_skip().await else {
        return;
    };
    let state = AppState::new_from_env().await.unwrap();
    let pool = &state.db;

    let key = format!("contract-conflict-{}", uuid::Uuid::new_v4());
    let headers = [
        ("x-user-id", "contract-test"),
        ("idempotency-key", key.as_str()),
    ];

    let (status, _) = send(
        &mut app,
        Method::POST,
        "/v2/expenses",
        json_body(serde_json::json!({
            "category": "material",
            "description": "primeiro payload",
            "amount": 10.0,
            "date": "2026-08-01"
        })),
        &headers,
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);

    let (status, body) = send(
        &mut app,
        Method::POST,
        "/v2/expenses",
        json_body(serde_json::json!({
            "category": "material",
            "description": "payload diferente",
            "amount": 20.0,
            "date": "2026-08-01"
        })),
        &headers,
    )
    .await;
    assert_eq!(
        status,
        StatusCode::CONFLICT,
        "same key with different payload should 409: {body}"
    );

    sqlx::query("DELETE FROM idempotency_keys WHERE \"key\" = $1")
        .bind(&key)
        .execute(pool)
        .await
        .unwrap();
}
