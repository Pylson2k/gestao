use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::modules::common::{
    fmt_dt, fmt_dt_opt, request_hash, require_user, run_with_idempotency, write_audit_log,
    ApiError, AuditEntry,
};
use crate::modules::users::{owner_db_user_ids, resolve_db_user_id};
use crate::state::AppState;

const VALID_PAYMENT_METHODS: [&str; 6] = [
    "dinheiro",
    "pix",
    "cartao_credito",
    "cartao_debito",
    "transferencia",
    "boleto",
];

fn parse_amount(value: &serde_json::Value) -> Option<f64> {
    let n = match value {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.trim().parse::<f64>().ok(),
        _ => None,
    };
    n.filter(|v| v.is_finite())
}

fn parse_date_opt(value: &serde_json::Value) -> Option<NaiveDateTime> {
    if value.is_null() {
        return None;
    }
    let s = value.as_str()?;
    if s.is_empty() {
        return None;
    }
    DateTime::parse_from_rfc3339(s)
        .map(|d| d.naive_utc())
        .ok()
        .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").ok())
        .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S").ok())
        .or_else(|| {
            NaiveDate::parse_from_str(s, "%Y-%m-%d")
                .ok()
                .map(|d| d.and_hms_opt(0, 0, 0).expect("00:00:00 is always valid"))
        })
}

fn now_naive() -> NaiveDateTime {
    Utc::now().naive_utc()
}

#[derive(FromRow)]
struct PaymentRow {
    id: String,
    quote_id: String,
    user_id: String,
    amount: f64,
    payment_date: NaiveDateTime,
    payment_method: String,
    observations: Option<String>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(FromRow)]
struct QuoteEmbedRow {
    id: String,
    number: String,
    user_id: String,
    client_id: String,
    subtotal: f64,
    discount: f64,
    total: f64,
    observations: Option<String>,
    payment_terms: Option<String>,
    conditions: Option<String>,
    deadlines: Option<String>,
    status: String,
    in_delinquency_list: bool,
    service_started_at: Option<NaiveDateTime>,
    service_completed_at: Option<NaiveDateTime>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(FromRow)]
struct ClientEmbedRow {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientEmbedDto {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuoteEmbedDto {
    id: String,
    number: String,
    user_id: String,
    client_id: String,
    subtotal: f64,
    discount: f64,
    total: f64,
    observations: Option<String>,
    payment_terms: Option<String>,
    conditions: Option<String>,
    deadlines: Option<String>,
    status: String,
    in_delinquency_list: bool,
    service_started_at: Option<String>,
    service_completed_at: Option<String>,
    created_at: String,
    updated_at: String,
    client: ClientEmbedDto,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentDto {
    id: String,
    quote_id: String,
    user_id: String,
    amount: f64,
    payment_date: String,
    payment_method: String,
    observations: Option<String>,
    created_at: String,
    updated_at: String,
    quote: QuoteEmbedDto,
}

#[derive(Deserialize)]
struct ListPaymentsQuery {
    #[serde(rename = "quoteId")]
    quote_id: Option<String>,
}

#[derive(Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct PaymentPayload {
    quote_id: Option<String>,
    amount: Option<serde_json::Value>,
    payment_date: Option<serde_json::Value>,
    payment_method: Option<String>,
    observations: Option<String>,
}

#[derive(Serialize)]
struct Success {
    success: bool,
}

async fn fetch_quote_embed(pool: &PgPool, quote_id: &str) -> Result<QuoteEmbedRow, ApiError> {
    let quote: Option<QuoteEmbedRow> = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE id = $1"#,
    )
    .bind(quote_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento do pagamento: {}", e),
        )
    })?;
    quote.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Orcamento nao encontrado"))
}

async fn fetch_client_embed(pool: &PgPool, client_id: &str) -> Result<ClientEmbedRow, ApiError> {
    let client: Option<ClientEmbedRow> = sqlx::query_as(
        r#"SELECT id, name, document, phone, address, email, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM clients WHERE id = $1"#,
    )
    .bind(client_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar cliente do orcamento: {}", e),
        )
    })?;
    client.ok_or_else(|| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "Cliente nao encontrado"))
}

async fn build_payment_dto(pool: &PgPool, payment: PaymentRow) -> Result<PaymentDto, ApiError> {
    let quote = fetch_quote_embed(pool, &payment.quote_id).await?;
    let client = fetch_client_embed(pool, &quote.client_id).await?;

    Ok(PaymentDto {
        id: payment.id,
        quote_id: payment.quote_id,
        user_id: payment.user_id,
        amount: payment.amount,
        payment_date: fmt_dt(payment.payment_date),
        payment_method: payment.payment_method,
        observations: payment.observations,
        created_at: fmt_dt(payment.created_at),
        updated_at: fmt_dt(payment.updated_at),
        quote: QuoteEmbedDto {
            id: quote.id,
            number: quote.number,
            user_id: quote.user_id,
            client_id: quote.client_id,
            subtotal: quote.subtotal,
            discount: quote.discount,
            total: quote.total,
            observations: quote.observations,
            payment_terms: quote.payment_terms,
            conditions: quote.conditions,
            deadlines: quote.deadlines,
            status: quote.status,
            in_delinquency_list: quote.in_delinquency_list,
            service_started_at: fmt_dt_opt(quote.service_started_at),
            service_completed_at: fmt_dt_opt(quote.service_completed_at),
            created_at: fmt_dt(quote.created_at),
            updated_at: fmt_dt(quote.updated_at),
            client: ClientEmbedDto {
                id: client.id,
                name: client.name,
                document: client.document,
                phone: client.phone,
                address: client.address,
                email: client.email,
                created_at: fmt_dt(client.created_at),
                updated_at: fmt_dt(client.updated_at),
            },
        },
    })
}

/// Remove o orcamento da lista de inadimplentes quando o total pago cobre o valor do orcamento.
async fn clear_delinquency_if_fully_paid(pool: &PgPool, quote_id: &str) {
    let quote: Option<(bool, f64)> =
        sqlx::query_as(r#"SELECT "inDelinquencyList", total FROM quotes WHERE id = $1"#)
            .bind(quote_id)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    let Some((in_delinquency, total)) = quote else {
        return;
    };
    if !in_delinquency {
        return;
    }

    let total_paid: Option<f64> =
        sqlx::query_scalar(r#"SELECT COALESCE(SUM(amount), 0) FROM payments WHERE "quoteId" = $1"#)
            .bind(quote_id)
            .fetch_one(pool)
            .await
            .ok();

    if let Some(total_paid) = total_paid {
        if total_paid >= total {
            let _ = sqlx::query("UPDATE quotes SET \"inDelinquencyList\" = false WHERE id = $1")
                .bind(quote_id)
                .execute(pool)
                .await;
        }
    }
}

async fn list_payments(
    State(state): State<AppState>,
    Query(query): Query<ListPaymentsQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<PaymentDto>>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    let mut result: Vec<PaymentDto> = Vec::new();

    if !owner_ids.is_empty() {
        let payments: Vec<PaymentRow> = sqlx::query_as(
            r#"SELECT id, "quoteId" AS quote_id, "userId" AS user_id, amount,
                      "paymentDate" AS payment_date, "paymentMethod" AS payment_method,
                      observations, "createdAt" AS created_at, "updatedAt" AS updated_at
               FROM payments
               WHERE "userId" = ANY($1)
                 AND ($2::text IS NULL OR "quoteId" = $2)
               ORDER BY "paymentDate" DESC"#,
        )
        .bind(&owner_ids)
        .bind(query.quote_id.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao buscar pagamentos: {}", e),
            )
        })?;

        for payment in payments {
            result.push(build_payment_dto(pool, payment).await?);
        }
    }

    Ok(Json(result))
}

async fn get_payment(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<PaymentDto>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    let payment: Option<PaymentRow> = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, "userId" AS user_id, amount,
                  "paymentDate" AS payment_date, "paymentMethod" AS payment_method,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM payments WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar pagamento: {}", e),
        )
    })?;

    let payment =
        payment.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Pagamento nao encontrado"))?;
    Ok(Json(build_payment_dto(pool, payment).await?))
}

fn overflow_response(total: f64, total_paid: f64) -> (StatusCode, Json<serde_json::Value>) {
    let remaining = total - total_paid;
    let message = format!(
        "Valor excede o total do orcamento. Total: R$ {total:.2}, Ja pago: R$ {total_paid:.2}, Restante: R$ {remaining:.2}"
    );
    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "error": message,
            "totalPaid": total_paid,
            "remaining": remaining,
        })),
    )
}

async fn create_payment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<PaymentPayload>,
) -> Result<Response, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let Some(db_user_id) = resolve_db_user_id(pool).await else {
        return Err(ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Falha ao mapear usuario autenticado",
        ));
    };

    let quote_id = body
        .quote_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "ID do orcamento e obrigatorio"))?;

    let amount_value = body.amount.as_ref().ok_or_else(|| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "Valor do pagamento deve ser maior que zero",
        )
    })?;
    let amount = parse_amount(amount_value)
        .filter(|n| *n > 0.0)
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::BAD_REQUEST,
                "Valor do pagamento deve ser maior que zero",
            )
        })?;

    let payment_date_value = body
        .payment_date
        .as_ref()
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Data do pagamento e obrigatoria"))?;
    let payment_date = parse_date_opt(payment_date_value)
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Data do pagamento e obrigatoria"))?;

    let payment_method = body
        .payment_method
        .as_deref()
        .filter(|m| VALID_PAYMENT_METHODS.contains(m))
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Metodo de pagamento invalido"))?;

    let quote: Option<(String, f64, f64)> = sqlx::query_as(
        r#"SELECT id, total, COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p."quoteId" = quotes.id), 0) FROM quotes WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(quote_id)
    .bind(&owner_db_user_ids(pool).await)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento: {}", e),
        )
    })?;

    let Some((_quote_id, quote_total, total_paid)) = quote else {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "Orcamento nao encontrado",
        ));
    };

    if total_paid + amount > quote_total {
        return Ok(overflow_response(quote_total, total_paid).into_response());
    }

    let observations = body
        .observations
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let idem_hash = request_hash(&body);
    let headers_ref = &headers;
    let db_user_id_ref = &db_user_id;

    run_with_idempotency(
        pool,
        &db_user_id,
        "/v2/payments",
        &headers,
        &idem_hash,
        || async move {
            let payment_id = Uuid::new_v4().to_string();
            let now = now_naive();

            sqlx::query(
                r#"INSERT INTO payments (id, "quoteId", "userId", amount, "paymentDate", "paymentMethod", observations, "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            )
            .bind(&payment_id)
            .bind(quote_id)
            .bind(db_user_id_ref)
            .bind(amount)
            .bind(payment_date)
            .bind(payment_method)
            .bind(observations.as_deref())
            .bind(now)
            .bind(now)
            .execute(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao criar pagamento: {}", e),
                )
            })?;

            let row: PaymentRow = sqlx::query_as(
                r#"SELECT id, "quoteId" AS quote_id, "userId" AS user_id, amount,
                          "paymentDate" AS payment_date, "paymentMethod" AS payment_method,
                          observations, "createdAt" AS created_at, "updatedAt" AS updated_at
                   FROM payments WHERE id = $1"#,
            )
            .bind(&payment_id)
            .fetch_one(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao buscar pagamento criado: {}", e),
                )
            })?;

            let dto = build_payment_dto(pool, row).await?;

            let description = format!(
                "Pagamento registrado - Orçamento {} - Valor: R$ {:.2} - Método: {}",
                dto.quote.number, dto.amount, dto.payment_method
            );
            let new_value = serde_json::json!({
                "quoteId": dto.quote_id,
                "amount": dto.amount,
                "paymentMethod": dto.payment_method,
                "paymentDate": dto.payment_date,
            });
            write_audit_log(
                pool,
                AuditEntry {
                    action: "create_payment",
                    entity_type: "payment",
                    entity_id: &payment_id,
                    description: &description,
                    old_value: None,
                    new_value: Some(&new_value),
                },
                headers_ref,
            )
            .await;

            clear_delinquency_if_fully_paid(pool, &dto.quote_id).await;

            Ok((StatusCode::CREATED, Json(dto)).into_response())
        },
    )
    .await
}

async fn update_payment(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<PaymentPayload>,
) -> Result<Json<PaymentDto>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;

    let existing: Option<PaymentRow> = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, "userId" AS user_id, amount,
                  "paymentDate" AS payment_date, "paymentMethod" AS payment_method,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM payments WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar pagamento: {}", e),
        )
    })?;

    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Pagamento nao encontrado"))?;

    if let Some(value) = body.amount.as_ref() {
        if parse_amount(value).map(|n| n <= 0.0).unwrap_or(true) {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "Valor do pagamento deve ser maior que zero",
            ));
        }
    }

    if let Some(method) = body.payment_method.as_deref() {
        if !VALID_PAYMENT_METHODS.contains(&method) {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "Metodo de pagamento invalido",
            ));
        }
    }

    let new_amount = body
        .amount
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(existing.amount);

    if let Some(value) = body.amount.as_ref() {
        let parsed = parse_amount(value).unwrap_or(existing.amount);
        if parsed != existing.amount {
            let quote: Option<(f64, f64)> = sqlx::query_as(
                r#"SELECT q.total, COALESCE(SUM(p.amount), 0)
                   FROM quotes q
                   LEFT JOIN payments p ON p."quoteId" = q.id AND p.id <> $1
                   WHERE q.id = $2 AND q."userId" = ANY($3)
                   GROUP BY q.id"#,
            )
            .bind(&id)
            .bind(&existing.quote_id)
            .bind(&owner_ids)
            .fetch_optional(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao buscar orcamento: {}", e),
                )
            })?;

            let Some((quote_total, total_paid)) = quote else {
                return Err(ApiError::new(
                    StatusCode::NOT_FOUND,
                    "Orcamento nao encontrado",
                ));
            };

            if total_paid + parsed > quote_total {
                let remaining = quote_total - total_paid;
                let message = format!(
                    "Valor excede o total do orcamento. Total: R$ {quote_total:.2}, Ja pago (outros): R$ {total_paid:.2}, Restante: R$ {remaining:.2}"
                );
                return Err(ApiError::new(StatusCode::BAD_REQUEST, message));
            }
        }
    }

    let payment_date =
        match body.payment_date.as_ref() {
            Some(v) => Some(parse_date_opt(v).ok_or_else(|| {
                ApiError::new(StatusCode::BAD_REQUEST, "Data do pagamento invalida")
            })?),
            None => None,
        };
    let observations = match body.observations.as_deref() {
        Some(v) => {
            let trimmed = v.trim();
            Some(if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            })
        }
        None => None,
    };

    sqlx::query(
        r#"UPDATE payments
           SET amount = $1, "paymentDate" = $2, "paymentMethod" = $3, observations = $4, "updatedAt" = NOW()
           WHERE id = $5"#,
    )
    .bind(new_amount)
    .bind(payment_date.unwrap_or(existing.payment_date))
    .bind(body.payment_method.as_deref().unwrap_or(&existing.payment_method))
    .bind(observations.unwrap_or(existing.observations.as_deref().map(|s| s.to_string())).as_deref())
    .bind(&id)
    .execute(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao atualizar pagamento: {}", e),
        )
    })?;

    let row: PaymentRow = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, "userId" AS user_id, amount,
                  "paymentDate" AS payment_date, "paymentMethod" AS payment_method,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM payments WHERE id = $1"#,
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar pagamento atualizado: {}", e),
        )
    })?;

    let dto = build_payment_dto(pool, row).await?;

    let description = format!(
        "Pagamento atualizado - Orçamento {} - Valor: R$ {:.2}",
        dto.quote.number, dto.amount
    );
    let new_value = serde_json::json!({
        "amount": dto.amount,
        "paymentDate": dto.payment_date,
        "paymentMethod": dto.payment_method,
        "observations": dto.observations,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "update_payment",
            entity_type: "payment",
            entity_id: &id,
            description: &description,
            old_value: None,
            new_value: Some(&new_value),
        },
        &headers,
    )
    .await;

    clear_delinquency_if_fully_paid(pool, &dto.quote_id).await;

    Ok(Json(dto))
}

async fn delete_payment(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Success>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;

    let payment: Option<PaymentRow> = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, "userId" AS user_id, amount,
                  "paymentDate" AS payment_date, "paymentMethod" AS payment_method,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM payments WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar pagamento: {}", e),
        )
    })?;

    let payment =
        payment.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Pagamento nao encontrado"))?;

    let quote_id_for_sync = payment.quote_id.clone();

    sqlx::query("DELETE FROM payments WHERE id = $1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao excluir pagamento: {}", e),
            )
        })?;

    clear_delinquency_if_fully_paid(pool, &quote_id_for_sync).await;

    let quote = fetch_quote_embed(pool, &quote_id_for_sync).await?;
    let description = format!(
        "Pagamento excluído - Orçamento {} - Valor: R$ {:.2}",
        quote.number, payment.amount
    );
    let old_value = serde_json::json!({
        "amount": payment.amount,
        "paymentDate": fmt_dt(payment.payment_date),
        "paymentMethod": payment.payment_method,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "delete_payment",
            entity_type: "payment",
            entity_id: &id,
            description: &description,
            old_value: Some(&old_value),
            new_value: None,
        },
        &headers,
    )
    .await;

    Ok(Json(Success { success: true }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_payments).post(create_payment))
        .route(
            "/{id}",
            get(get_payment).put(update_payment).delete(delete_payment),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_amount_handles_number_and_string() {
        assert_eq!(parse_amount(&serde_json::json!(150.5)), Some(150.5));
        assert_eq!(parse_amount(&serde_json::json!("150.5")), Some(150.5));
        assert_eq!(parse_amount(&serde_json::json!("0")), Some(0.0));
        assert_eq!(parse_amount(&serde_json::json!("abc")), None);
        assert_eq!(parse_amount(&serde_json::json!(null)), None);
        assert_eq!(parse_amount(&serde_json::json!(true)), None);
    }

    #[test]
    fn payment_methods_are_valid() {
        assert_eq!(VALID_PAYMENT_METHODS.len(), 6);
        assert!(VALID_PAYMENT_METHODS.contains(&"pix"));
        assert!(VALID_PAYMENT_METHODS.contains(&"boleto"));
    }

    #[test]
    fn parse_date_opt_accepts_iso_and_date_only() {
        assert!(parse_date_opt(&serde_json::json!("2026-08-01")).is_some());
        assert!(parse_date_opt(&serde_json::json!("2026-08-01T12:00:00Z")).is_some());
        assert!(parse_date_opt(&serde_json::json!(null)).is_none());
        assert!(parse_date_opt(&serde_json::json!("invalido")).is_none());
    }
}
