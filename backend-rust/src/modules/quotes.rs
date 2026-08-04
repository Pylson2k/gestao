use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::modules::common::{
    fmt_dt, fmt_dt_opt, require_user, write_audit_log, ApiError, AuditEntry,
};
use crate::modules::users::{owner_db_user_ids, resolve_db_user_id};
use crate::state::AppState;

const DEFAULT_MATERIAL_UNIT: &str = "unidade";
const MATERIAL_UNITS: [&str; 12] = [
    "unidade",
    "metro",
    "metro_quadrado",
    "metro_cubico",
    "kg",
    "litro",
    "caixa",
    "rolo",
    "saco",
    "par",
    "galao",
    "metro_linear",
];

/// Normaliza unidade de material (default "unidade").
fn resolve_material_unit(raw: Option<&str>) -> String {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        Some(t) if MATERIAL_UNITS.contains(&t) => t.to_string(),
        _ => DEFAULT_MATERIAL_UNIT.to_string(),
    }
}

/// Interpreta texto/número de quantidade (espelha `parseQuantityInput`).
fn parse_quantity_input(raw: &str) -> Option<f64> {
    let s = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    if s.is_empty() {
        return None;
    }

    if let Some(caps) = regex_mixed_fraction(&s) {
        return Some(caps);
    }
    if let Some(caps) = regex_fraction(&s) {
        return Some(caps);
    }

    let last_comma = s.rfind(',');
    let last_dot = s.rfind('.');
    let normalized = match (last_comma, last_dot) {
        (Some(c), Some(d)) if c > d => s.replace('.', "").replace(',', "."),
        (Some(_), Some(_)) => s.replace(',', ""),
        (Some(_), None) => s.replace('.', "").replace(',', "."),
        (None, Some(_)) => s.replace(',', ""),
        _ => s,
    };
    normalized.trim().parse::<f64>().ok()
}

fn regex_mixed_fraction(s: &str) -> Option<f64> {
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() != 2 {
        return None;
    }
    let whole = parts[0].parse::<f64>().ok()?;
    let frac: Vec<&str> = parts[1].split('/').collect();
    if frac.len() != 2 {
        return None;
    }
    let num = frac[0].parse::<f64>().ok()?;
    let den = frac[1].parse::<f64>().ok()?;
    if den == 0.0 {
        return None;
    }
    Some(whole + num / den)
}

fn regex_fraction(s: &str) -> Option<f64> {
    let frac: Vec<&str> = s.split('/').collect();
    if frac.len() != 2 {
        return None;
    }
    let num = frac[0].trim().parse::<f64>().ok()?;
    let den = frac[1].trim().parse::<f64>().ok()?;
    if den == 0.0 {
        return None;
    }
    Some(num / den)
}

fn normalize_stored_quantity(parsed: f64) -> f64 {
    if parsed.is_finite() && parsed > 0.0 {
        (parsed * 10000.0).round() / 10000.0
    } else {
        1.0
    }
}

fn resolve_material_quantity(raw: &serde_json::Value) -> f64 {
    match raw {
        serde_json::Value::Number(n) => n.as_f64().map(normalize_stored_quantity),
        serde_json::Value::String(s) => Some(normalize_stored_quantity(
            parse_quantity_input(s).unwrap_or(1.0),
        )),
        _ => None,
    }
    .unwrap_or(1.0)
}

#[derive(FromRow)]
struct ClientRow {
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
struct ClientDto {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientFullDto {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: String,
    updated_at: String,
}

impl From<ClientRow> for ClientFullDto {
    fn from(c: ClientRow) -> Self {
        Self {
            id: c.id,
            name: c.name,
            document: c.document,
            phone: c.phone,
            address: c.address,
            email: c.email,
            created_at: fmt_dt(c.created_at),
            updated_at: fmt_dt(c.updated_at),
        }
    }
}

#[derive(FromRow)]
struct ServiceItemRow {
    id: String,
    quote_id: String,
    name: String,
    quantity: i32,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceItemDto {
    id: String,
    name: String,
    quantity: i32,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceItemFullDto {
    id: String,
    quote_id: String,
    name: String,
    quantity: i32,
    unit_price: f64,
}

impl From<ServiceItemRow> for ServiceItemFullDto {
    fn from(s: ServiceItemRow) -> Self {
        Self {
            id: s.id,
            quote_id: s.quote_id,
            name: s.name,
            quantity: s.quantity,
            unit_price: s.unit_price,
        }
    }
}

#[derive(FromRow)]
struct MaterialItemRow {
    id: String,
    quote_id: String,
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MaterialItemDto {
    id: String,
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MaterialItemFullDto {
    id: String,
    quote_id: String,
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

impl From<MaterialItemRow> for MaterialItemFullDto {
    fn from(m: MaterialItemRow) -> Self {
        Self {
            id: m.id,
            quote_id: m.quote_id,
            name: m.name,
            quantity: m.quantity,
            unit: m.unit,
            unit_price: m.unit_price,
        }
    }
}

#[derive(FromRow)]
struct PaymentRow {
    id: String,
    quote_id: String,
    amount: f64,
    payment_date: NaiveDateTime,
    payment_method: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentDto {
    id: String,
    amount: f64,
    payment_date: String,
    payment_method: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentFullDto {
    id: String,
    quote_id: String,
    amount: f64,
    payment_date: String,
    payment_method: String,
}

impl From<PaymentRow> for PaymentFullDto {
    fn from(p: PaymentRow) -> Self {
        Self {
            id: p.id,
            quote_id: p.quote_id,
            amount: p.amount,
            payment_date: fmt_dt(p.payment_date),
            payment_method: p.payment_method,
        }
    }
}

#[derive(FromRow)]
struct QuoteRow {
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuoteDto {
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
    client: ClientDto,
    services: Vec<ServiceItemDto>,
    materials: Vec<MaterialItemDto>,
    payments: Vec<PaymentDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuoteFullDto {
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
    client: ClientFullDto,
    services: Vec<ServiceItemFullDto>,
    materials: Vec<MaterialItemFullDto>,
    payments: Vec<PaymentFullDto>,
}

#[derive(Deserialize)]
struct ListQuotesQuery {
    status: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct QuotePayload {
    client: Option<ClientPayload>,
    services: Option<Vec<ServicePayload>>,
    materials: Option<Vec<MaterialPayload>>,
    subtotal: Option<serde_json::Value>,
    discount: Option<serde_json::Value>,
    total: Option<serde_json::Value>,
    observations: Option<String>,
    payment_terms: Option<String>,
    conditions: Option<String>,
    deadlines: Option<String>,
    status: Option<String>,
    in_delinquency_list: Option<bool>,
    service_started_at: Option<serde_json::Value>,
    service_completed_at: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientPayload {
    id: Option<String>,
    name: Option<String>,
    document: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    email: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServicePayload {
    name: Option<String>,
    quantity: Option<serde_json::Value>,
    unit_price: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MaterialPayload {
    name: Option<String>,
    quantity: Option<serde_json::Value>,
    unit: Option<String>,
    unit_price: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct Success {
    success: bool,
}

fn as_f64(v: &serde_json::Value) -> f64 {
    v.as_f64()
        .or_else(|| v.as_str().and_then(|s| s.trim().parse::<f64>().ok()))
        .filter(|n| n.is_finite())
        .unwrap_or(0.0)
}

fn as_i64(v: &serde_json::Value) -> i64 {
    let n = as_f64(v);
    if n <= 0.0 {
        1
    } else {
        (n.round()).max(1.0) as i64
    }
}

fn trim_or(s: Option<&str>, default: &str) -> String {
    match s.map(str::trim).filter(|x| !x.is_empty()) {
        Some(v) => v.to_string(),
        None => default.to_string(),
    }
}

fn trim_null(s: Option<&str>) -> Option<String> {
    s.map(str::trim)
        .filter(|x| !x.is_empty())
        .map(|v| v.to_string())
}

fn parse_date_opt(value: Option<&serde_json::Value>) -> Option<NaiveDateTime> {
    let v = value?;
    if v.is_null() {
        return None;
    }
    let s = v.as_str()?;
    if s.is_empty() {
        return None;
    }
    chrono::DateTime::parse_from_rfc3339(s)
        .map(|d| d.naive_utc())
        .ok()
        .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").ok())
        .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%d").ok())
}

fn now_naive() -> NaiveDateTime {
    Utc::now().naive_utc()
}

async fn fetch_client(pool: &PgPool, id: &str) -> Result<ClientRow, ApiError> {
    let client: Option<ClientRow> = sqlx::query_as(
        r#"SELECT id, name, document, phone, address, email, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM clients WHERE id = $1"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar cliente: {}", e),
        )
    })?;
    client.ok_or_else(|| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "Cliente nao encontrado"))
}

async fn fetch_quote_items(
    pool: &PgPool,
    quote_id: &str,
) -> Result<(Vec<ServiceItemRow>, Vec<MaterialItemRow>, Vec<PaymentRow>), ApiError> {
    let services: Vec<ServiceItemRow> = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, name, quantity, "unitPrice" AS unit_price
           FROM service_items WHERE "quoteId" = $1 ORDER BY id"#,
    )
    .bind(quote_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar servicos do orcamento: {}", e),
        )
    })?;

    let materials: Vec<MaterialItemRow> = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, name, quantity, unit, "unitPrice" AS unit_price
           FROM material_items WHERE "quoteId" = $1 ORDER BY id"#,
    )
    .bind(quote_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar materiais do orcamento: {}", e),
        )
    })?;

    let payments: Vec<PaymentRow> = sqlx::query_as(
        r#"SELECT id, "quoteId" AS quote_id, amount, "paymentDate" AS payment_date, "paymentMethod" AS payment_method
           FROM payments WHERE "quoteId" = $1 ORDER BY "paymentDate" DESC"#,
    )
    .bind(quote_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar pagamentos do orcamento: {}", e),
        )
    })?;

    Ok((services, materials, payments))
}

async fn build_quote_dto(pool: &PgPool, quote: QuoteRow) -> Result<QuoteDto, ApiError> {
    let client = fetch_client(pool, &quote.client_id).await?;
    let (services, materials, payments) = fetch_quote_items(pool, &quote.id).await?;

    Ok(QuoteDto {
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
        client: ClientDto {
            id: client.id,
            name: client.name,
            document: client.document,
            phone: client.phone,
            address: client.address,
            email: client.email,
        },
        services: services
            .into_iter()
            .map(|s| ServiceItemDto {
                id: s.id,
                name: s.name,
                quantity: s.quantity,
                unit_price: s.unit_price,
            })
            .collect(),
        materials: materials
            .into_iter()
            .map(|m| MaterialItemDto {
                id: m.id,
                name: m.name,
                quantity: m.quantity,
                unit: m.unit,
                unit_price: m.unit_price,
            })
            .collect(),
        payments: payments
            .into_iter()
            .map(|p| PaymentDto {
                id: p.id,
                amount: p.amount,
                payment_date: fmt_dt(p.payment_date),
                payment_method: p.payment_method,
            })
            .collect(),
    })
}

async fn build_quote_full_dto(pool: &PgPool, quote: QuoteRow) -> Result<QuoteFullDto, ApiError> {
    let client = fetch_client(pool, &quote.client_id).await?;
    let (services, materials, payments) = fetch_quote_items(pool, &quote.id).await?;

    Ok(QuoteFullDto {
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
        client: ClientFullDto::from(client),
        services: services.into_iter().map(ServiceItemFullDto::from).collect(),
        materials: materials
            .into_iter()
            .map(MaterialItemFullDto::from)
            .collect(),
        payments: payments.into_iter().map(PaymentFullDto::from).collect(),
    })
}

async fn list_quotes(
    State(state): State<AppState>,
    Query(query): Query<ListQuotesQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<QuoteDto>>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    if owner_ids.is_empty() {
        return Ok(Json(Vec::new()));
    }

    let quotes: Vec<QuoteRow> = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes
           WHERE "userId" = ANY($1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY "createdAt" DESC
           LIMIT 100"#,
    )
    .bind(&owner_ids)
    .bind(query.status.as_deref())
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamentos: {}", e),
        )
    })?;

    let mut result = Vec::with_capacity(quotes.len());
    for quote in quotes {
        result.push(build_quote_dto(pool, quote).await?);
    }
    Ok(Json(result))
}

async fn create_quote(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<QuotePayload>,
) -> Result<impl IntoResponse, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let Some(db_user_id) = resolve_db_user_id(pool).await else {
        return Err(ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Falha ao mapear usuario autenticado",
        ));
    };

    let now = now_naive();
    let year = now.format("%Y").to_string();

    let services = body.services.unwrap_or_default();
    let materials = body.materials.unwrap_or_default();

    // Resolve/upsert cliente
    let client_name = trim_or(
        body.client.as_ref().and_then(|c| c.name.as_deref()),
        "Cliente",
    );
    let client_document = body
        .client
        .as_ref()
        .and_then(|c| trim_null(c.document.as_deref()));
    let client_phone = trim_or(body.client.as_ref().and_then(|c| c.phone.as_deref()), "");
    let client_address = trim_or(body.client.as_ref().and_then(|c| c.address.as_deref()), "");
    let client_email = body
        .client
        .as_ref()
        .and_then(|c| trim_null(c.email.as_deref()));

    let client_id_hint = body
        .client
        .as_ref()
        .and_then(|c| c.id.as_deref())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let client_id: String = if let Some(hint) = client_id_hint {
        let existing: Option<ClientRow> = sqlx::query_as(
            r#"SELECT id, name, document, phone, address, email FROM clients WHERE id = $1"#,
        )
        .bind(&hint)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao buscar cliente: {}", e),
            )
        })?;

        match existing {
            Some(_) => {
                let row: ClientRow = sqlx::query_as(
                    r#"UPDATE clients
                       SET name = $1, document = $2, phone = $3, address = $4, email = $5, "updatedAt" = NOW()
                       WHERE id = $6
                       RETURNING id, name, document, phone, address, email"#,
                )
                .bind(&client_name)
                .bind(&client_document)
                .bind(&client_phone)
                .bind(&client_address)
                .bind(&client_email)
                .bind(&hint)
                .fetch_one(pool)
                .await
                .map_err(|e| {
                    ApiError::new(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Erro ao atualizar cliente: {}", e),
                    )
                })?;
                row.id
            }
            None => {
                let id = Uuid::new_v4().to_string();
                sqlx::query(
                    r#"INSERT INTO clients (id, name, document, phone, address, email, "createdAt", "updatedAt")
                       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())"#,
                )
                .bind(&id)
                .bind(&client_name)
                .bind(&client_document)
                .bind(&client_phone)
                .bind(&client_address)
                .bind(&client_email)
                .execute(pool)
                .await
                .map_err(|e| {
                    ApiError::new(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Erro ao criar cliente: {}", e),
                    )
                })?;
                id
            }
        }
    } else {
        let id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"INSERT INTO clients (id, name, document, phone, address, email, "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())"#,
        )
        .bind(&id)
        .bind(&client_name)
        .bind(&client_document)
        .bind(&client_phone)
        .bind(&client_address)
        .bind(&client_email)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao criar cliente: {}", e),
            )
        })?;
        id
    };

    let status = body.status.clone().unwrap_or_else(|| "draft".to_string());

    let subtotal = body.subtotal.as_ref().map(as_f64).unwrap_or(0.0);
    let discount = body.discount.as_ref().map(as_f64).unwrap_or(0.0);
    let total = body.total.as_ref().map(as_f64).unwrap_or(0.0);
    let observations = trim_null(body.observations.as_deref());
    let payment_terms = trim_null(body.payment_terms.as_deref());
    let conditions = trim_null(body.conditions.as_deref());
    let deadlines = trim_null(body.deadlines.as_deref());
    let service_started_at = parse_date_opt(body.service_started_at.as_ref());
    let service_completed_at = parse_date_opt(body.service_completed_at.as_ref());

    let insert_quote = |number: String, quote_id: String| {
        let db = state.db.clone();
        let client_id = client_id.clone();
        let status = status.clone();
        let db_user_id = db_user_id.clone();
        let observations = observations.clone();
        let payment_terms = payment_terms.clone();
        let conditions = conditions.clone();
        let deadlines = deadlines.clone();
        async move {
            sqlx::query(
                r#"INSERT INTO quotes (id, number, "userId", "clientId", subtotal, discount, total,
                       observations, "paymentTerms", conditions, deadlines, status, "inDelinquencyList",
                       "serviceStartedAt", "serviceCompletedAt", "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())"#,
            )
            .bind(&quote_id)
            .bind(&number)
            .bind(&db_user_id)
            .bind(&client_id)
            .bind(subtotal)
            .bind(discount)
            .bind(total)
            .bind(observations.as_deref())
            .bind(payment_terms.as_deref())
            .bind(conditions.as_deref())
            .bind(deadlines.as_deref())
            .bind(&status)
            .bind(false)
            .bind(service_started_at)
            .bind(service_completed_at)
            .execute(&db)
            .await
        }
    };

    let quotes_year: Vec<String> =
        sqlx::query_scalar(r#"SELECT number FROM quotes WHERE number LIKE $1"#)
            .bind(format!("ORC-{}-%", year))
            .fetch_all(pool)
            .await
            .unwrap_or_default();

    let base_number = format!("ORC-{}-{:03}", year, max_seq(&quotes_year) + 1);
    let quote_id = Uuid::new_v4().to_string();

    let insert_result = insert_quote(base_number.clone(), quote_id.clone()).await;
    let _number = match insert_result {
        Ok(_) => base_number,
        Err(err) if is_unique_violation(&err) => {
            let fallback = format!("ORC-{}-{}", year, Utc::now().timestamp_millis());
            insert_quote(fallback.clone(), quote_id.clone())
                .await
                .map_err(|e| {
                    ApiError::new(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Erro ao criar orcamento: {}", e),
                    )
                })?;
            fallback
        }
        Err(e) => {
            return Err(ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao criar orcamento: {}", e),
            ))
        }
    };

    if !services.is_empty() {
        insert_service_items(pool, &quote_id, &services).await?;
    }
    if !materials.is_empty() {
        insert_material_items(pool, &quote_id, &materials).await?;
    }

    let row: QuoteRow = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE id = $1"#,
    )
    .bind(&quote_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento criado: {}", e),
        )
    })?;

    let dto = build_quote_full_dto(pool, row).await?;

    let description = format!(
        "Orcamento {} criado - Cliente: {} - Total: R$ {:.2}",
        dto.number, dto.client.name, dto.total
    );
    let new_value = serde_json::json!({
        "number": dto.number,
        "client": dto.client.name,
        "total": dto.total,
        "subtotal": dto.subtotal,
        "discount": dto.discount,
        "status": dto.status,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "create_quote",
            entity_type: "quote",
            entity_id: &quote_id,
            description: &description,
            old_value: None,
            new_value: Some(&new_value),
        },
        &headers,
    )
    .await;

    Ok((StatusCode::CREATED, Json(dto)))
}

fn max_seq(numbers: &[String]) -> i64 {
    let mut max = 0i64;
    for n in numbers {
        if let Some(idx) = n.rfind('-') {
            if let Ok(v) = n[idx + 1..].parse::<i64>() {
                if v > max {
                    max = v;
                }
            }
        }
    }
    max
}

fn is_unique_violation(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::Database(db) => db.code().as_deref() == Some("23505"),
        _ => false,
    }
}

async fn insert_service_items(
    pool: &PgPool,
    quote_id: &str,
    items: &[ServicePayload],
) -> Result<(), ApiError> {
    for item in items {
        let quantity = item.quantity.as_ref().map(as_i64).unwrap_or(1);
        sqlx::query(
            r#"INSERT INTO service_items (id, "quoteId", name, quantity, "unitPrice")
               VALUES ($1, $2, $3, $4, $5)"#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(quote_id)
        .bind(trim_or(item.name.as_deref(), "Serviço"))
        .bind(quantity)
        .bind(item.unit_price.as_ref().map(as_f64).unwrap_or(0.0))
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao criar servicos do orcamento: {}", e),
            )
        })?;
    }
    Ok(())
}

async fn insert_material_items(
    pool: &PgPool,
    quote_id: &str,
    items: &[MaterialPayload],
) -> Result<(), ApiError> {
    for item in items {
        let quantity =
            resolve_material_quantity(item.quantity.as_ref().unwrap_or(&serde_json::Value::Null));
        sqlx::query(
            r#"INSERT INTO material_items (id, "quoteId", name, quantity, unit, "unitPrice")
               VALUES ($1, $2, $3, $4, $5, $6)"#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(quote_id)
        .bind(trim_or(item.name.as_deref(), "Material"))
        .bind(quantity)
        .bind(resolve_material_unit(item.unit.as_deref()))
        .bind(item.unit_price.as_ref().map(as_f64).unwrap_or(0.0))
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao criar materiais do orcamento: {}", e),
            )
        })?;
    }
    Ok(())
}

async fn get_quote(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<QuoteFullDto>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    if owner_ids.is_empty() {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "Orcamento nao encontrado",
        ));
    }

    let quote: Option<QuoteRow> = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento: {}", e),
        )
    })?;

    let quote =
        quote.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Orcamento nao encontrado"))?;
    Ok(Json(build_quote_full_dto(pool, quote).await?))
}

async fn update_quote(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<QuotePayload>,
) -> Result<Json<QuoteFullDto>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    if owner_ids.is_empty() {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "Orcamento nao encontrado",
        ));
    }

    let existing: Option<QuoteRow> = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento: {}", e),
        )
    })?;

    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Orcamento nao encontrado"))?;

    let status = body
        .status
        .clone()
        .unwrap_or_else(|| existing.status.clone());
    let in_delinquency = body
        .in_delinquency_list
        .unwrap_or(existing.in_delinquency_list);
    let subtotal = body
        .subtotal
        .as_ref()
        .map(as_f64)
        .unwrap_or(existing.subtotal);
    let discount = body
        .discount
        .as_ref()
        .map(as_f64)
        .unwrap_or(existing.discount);
    let total = body.total.as_ref().map(as_f64).unwrap_or(existing.total);
    let observations = match body.observations.as_deref() {
        Some(v) if v.trim().is_empty() => None,
        Some(v) => Some(v.to_string()),
        None => existing.observations.clone(),
    };
    let payment_terms = match body.payment_terms.as_deref() {
        Some(v) if v.trim().is_empty() => None,
        Some(v) => Some(v.to_string()),
        None => existing.payment_terms.clone(),
    };
    let conditions = match body.conditions.as_deref() {
        Some(v) if v.trim().is_empty() => None,
        Some(v) => Some(v.to_string()),
        None => existing.conditions.clone(),
    };
    let deadlines = match body.deadlines.as_deref() {
        Some(v) if v.trim().is_empty() => None,
        Some(v) => Some(v.to_string()),
        None => existing.deadlines.clone(),
    };
    let service_started_at = match body.service_started_at.as_ref() {
        Some(v) => parse_date_opt(Some(v)),
        None => existing.service_started_at,
    };
    let service_completed_at = match body.service_completed_at.as_ref() {
        Some(v) => parse_date_opt(Some(v)),
        None => existing.service_completed_at,
    };

    sqlx::query(
        r#"UPDATE quotes
           SET status = $1, "inDelinquencyList" = $2, subtotal = $3, discount = $4, total = $5,
               observations = $6, "paymentTerms" = $7, conditions = $8, deadlines = $9,
               "serviceStartedAt" = $10, "serviceCompletedAt" = $11, "updatedAt" = NOW()
           WHERE id = $12"#,
    )
    .bind(&status)
    .bind(in_delinquency)
    .bind(subtotal)
    .bind(discount)
    .bind(total)
    .bind(&observations)
    .bind(&payment_terms)
    .bind(&conditions)
    .bind(&deadlines)
    .bind(service_started_at)
    .bind(service_completed_at)
    .bind(&id)
    .execute(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao atualizar orcamento: {}", e),
        )
    })?;

    if let Some(client) = body.client.as_ref() {
        sqlx::query(
            r#"UPDATE clients SET name = $1, document = $2, phone = $3, address = $4, email = $5, "updatedAt" = NOW()
               WHERE id = $6"#,
        )
        .bind(trim_or(client.name.as_deref(), "Cliente"))
        .bind(client.document.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()))
        .bind(trim_or(client.phone.as_deref(), ""))
        .bind(trim_or(client.address.as_deref(), ""))
        .bind(client.email.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()))
        .bind(&existing.client_id)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao atualizar cliente do orcamento: {}", e),
            )
        })?;
    }

    if let Some(services) = body.services.as_ref() {
        sqlx::query(r#"DELETE FROM service_items WHERE "quoteId" = $1"#)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao limpar servicos do orcamento: {}", e),
                )
            })?;
        insert_service_items(pool, &id, services).await?;
    }

    if let Some(materials) = body.materials.as_ref() {
        sqlx::query(r#"DELETE FROM material_items WHERE "quoteId" = $1"#)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao limpar materiais do orcamento: {}", e),
                )
            })?;
        insert_material_items(pool, &id, materials).await?;
    }

    let row: QuoteRow = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE id = $1"#,
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento atualizado: {}", e),
        )
    })?;

    let dto = build_quote_full_dto(pool, row).await?;

    let number = dto.number.clone();
    if body.in_delinquency_list.is_some() && existing.in_delinquency_list != in_delinquency {
        let description = format!(
            "Lista de inadimplentes ({}): {}",
            number,
            if in_delinquency {
                "incluído"
            } else {
                "removido"
            }
        );
        write_audit_log(
            pool,
            AuditEntry {
                action: "toggle_quote_delinquency_list",
                entity_type: "quote",
                entity_id: &id,
                description: &description,
                old_value: Some(
                    &serde_json::json!({ "inDelinquencyList": existing.in_delinquency_list }),
                ),
                new_value: Some(&serde_json::json!({ "inDelinquencyList": in_delinquency })),
            },
            &headers,
        )
        .await;
    }

    if body.status.is_some() && existing.status != status {
        let description = format!(
            "Status do orcamento {} alterado de \"{}\" para \"{}\"",
            number, existing.status, status
        );
        write_audit_log(
            pool,
            AuditEntry {
                action: "change_quote_status",
                entity_type: "quote",
                entity_id: &id,
                description: &description,
                old_value: Some(&serde_json::json!({ "status": existing.status })),
                new_value: Some(&serde_json::json!({ "status": status })),
            },
            &headers,
        )
        .await;
    }

    if body.discount.is_some() && existing.discount != discount {
        let description = format!(
            "Desconto do orcamento {} alterado de R$ {:.2} para R$ {:.2}",
            number, existing.discount, discount
        );
        write_audit_log(
            pool,
            AuditEntry {
                action: "change_quote_discount",
                entity_type: "quote",
                entity_id: &id,
                description: &description,
                old_value: Some(
                    &serde_json::json!({ "discount": existing.discount, "total": existing.total }),
                ),
                new_value: Some(&serde_json::json!({ "discount": discount, "total": total })),
            },
            &headers,
        )
        .await;
    }

    if body.total.is_some() && existing.total != total {
        let description = format!(
            "Total do orcamento {} alterado de R$ {:.2} para R$ {:.2}",
            number, existing.total, total
        );
        write_audit_log(
            pool,
            AuditEntry {
                action: "change_quote_total",
                entity_type: "quote",
                entity_id: &id,
                description: &description,
                old_value: Some(&serde_json::json!({ "total": existing.total })),
                new_value: Some(&serde_json::json!({ "total": total })),
            },
            &headers,
        )
        .await;
    }

    Ok(Json(dto))
}

async fn delete_quote(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Success>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    if owner_ids.is_empty() {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "Orcamento nao encontrado",
        ));
    }

    let quote: Option<QuoteRow> = sqlx::query_as(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id,
                  subtotal, discount, total, observations,
                  "paymentTerms" AS payment_terms, conditions, deadlines,
                  status, "inDelinquencyList" AS in_delinquency_list,
                  "serviceStartedAt" AS service_started_at, "serviceCompletedAt" AS service_completed_at,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamento: {}", e),
        )
    })?;

    let quote =
        quote.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Orcamento nao encontrado"))?;

    let old_value = serde_json::json!({
        "number": quote.number,
        "client": quote.client_id,
        "total": quote.total,
        "status": quote.status,
    });

    let description = if quote.status == "completed" {
        format!(
            "⚠️ TENTATIVA DE EXCLUSÃO DE ORÇAMENTO FINALIZADO - {} - Total: R$ {:.2}",
            quote.number, quote.total
        )
    } else {
        format!(
            "Orcamento {} EXCLUIDO - Total: R$ {:.2}",
            quote.number, quote.total
        )
    };

    write_audit_log(
        pool,
        AuditEntry {
            action: "delete_quote",
            entity_type: "quote",
            entity_id: &id,
            description: &description,
            old_value: Some(&old_value),
            new_value: None,
        },
        &headers,
    )
    .await;

    sqlx::query("DELETE FROM quotes WHERE id = $1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao excluir orcamento: {}", e),
            )
        })?;

    Ok(Json(Success { success: true }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_quotes).post(create_quote))
        .route(
            "/{id}",
            get(get_quote).put(update_quote).delete(delete_quote),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_material_unit_keeps_valid_and_defaults() {
        assert_eq!(resolve_material_unit(Some("metro")), "metro");
        assert_eq!(resolve_material_unit(Some("caixa")), "caixa");
        assert_eq!(resolve_material_unit(Some("METRO")), "unidade");
        assert_eq!(resolve_material_unit(Some("invalido")), "unidade");
        assert_eq!(resolve_material_unit(None), "unidade");
        assert_eq!(resolve_material_unit(Some("  ")), "unidade");
    }

    #[test]
    fn parse_quantity_input_handles_fractions_and_decimals() {
        assert_eq!(parse_quantity_input("1/2"), Some(0.5));
        assert_eq!(parse_quantity_input("1 1/2"), Some(1.5));
        assert_eq!(parse_quantity_input("0,5"), Some(0.5));
        assert_eq!(parse_quantity_input("0.5"), Some(0.5));
        assert_eq!(parse_quantity_input("1.999"), Some(1.999));
        assert_eq!(parse_quantity_input("abc"), None);
        assert_eq!(parse_quantity_input(""), None);
    }

    #[test]
    fn normalize_stored_quantity_clamps_zero() {
        assert_eq!(normalize_stored_quantity(0.0), 1.0);
        assert_eq!(normalize_stored_quantity(-2.0), 1.0);
        assert_eq!(normalize_stored_quantity(1.23456), 1.2346);
    }

    #[test]
    fn max_seq_parses_numbers() {
        assert_eq!(max_seq(&["ORC-2026-001".into(), "ORC-2026-007".into()]), 7);
        assert_eq!(max_seq(&["ORC-2025-999".into()]), 999);
        assert_eq!(max_seq(&[]), 0);
    }
}
