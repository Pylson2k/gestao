use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::modules::common::{fmt_dt, require_user, write_audit_log, ApiError, AuditEntry};
use crate::state::AppState;

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
    created_at: String,
    updated_at: String,
}

impl From<ClientRow> for ClientDto {
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientListItem {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: String,
    updated_at: String,
    #[serde(rename = "_count")]
    count: ClientCount,
}

#[derive(Serialize)]
struct ClientCount {
    quotes: i64,
}

#[derive(FromRow)]
struct ClientListRow {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
    quotes: i64,
}

impl From<ClientListRow> for ClientListItem {
    fn from(c: ClientListRow) -> Self {
        Self {
            id: c.id,
            name: c.name,
            document: c.document,
            phone: c.phone,
            address: c.address,
            email: c.email,
            created_at: fmt_dt(c.created_at),
            updated_at: fmt_dt(c.updated_at),
            count: ClientCount { quotes: c.quotes },
        }
    }
}

#[derive(FromRow)]
struct QuoteRow {
    id: String,
    number: String,
    subtotal: f64,
    discount: f64,
    total: f64,
    observations: Option<String>,
    status: String,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuoteDto {
    id: String,
    number: String,
    subtotal: f64,
    discount: f64,
    total: f64,
    observations: Option<String>,
    status: String,
    created_at: String,
    updated_at: String,
}

impl From<QuoteRow> for QuoteDto {
    fn from(q: QuoteRow) -> Self {
        Self {
            id: q.id,
            number: q.number,
            subtotal: q.subtotal,
            discount: q.discount,
            total: q.total,
            observations: q.observations,
            status: q.status,
            created_at: fmt_dt(q.created_at),
            updated_at: fmt_dt(q.updated_at),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientDetailDto {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: String,
    updated_at: String,
    quotes: Vec<QuoteDto>,
}

#[derive(Deserialize)]
struct SearchQuery {
    search: Option<String>,
}

#[derive(Deserialize)]
struct CreateClientRequest {
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
}

#[derive(Deserialize, Default)]
struct UpdateClientRequest {
    name: Option<String>,
    document: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    email: Option<String>,
}

#[derive(Serialize)]
struct Success {
    success: bool,
}

async fn list_clients(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<ClientListItem>>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let rows: Vec<ClientListRow> = sqlx::query_as(
        r#"SELECT c.id, c.name, c.document, c.phone, c.address, c.email,
                  c."createdAt" AS created_at, c."updatedAt" AS updated_at,
                  (SELECT COUNT(*) FROM quotes q WHERE q."clientId" = c.id)::bigint AS quotes
           FROM clients c
           WHERE $1::text IS NULL
              OR c.name ILIKE '%' || $1 || '%'
              OR c.document ILIKE '%' || $1 || '%'
              OR c.phone ILIKE '%' || $1 || '%'
              OR c.email ILIKE '%' || $1 || '%'
           ORDER BY c.name ASC"#,
    )
    .bind(&query.search)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar clientes: {}", e),
        )
    })?;

    Ok(Json(rows.into_iter().map(ClientListItem::from).collect()))
}

async fn create_client(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateClientRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let name = body.name.trim();
    let phone = body.phone.trim();
    let address = body.address.trim();

    if name.is_empty() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Nome e obrigatorio"));
    }
    if phone.is_empty() {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Telefone e obrigatorio",
        ));
    }
    if address.is_empty() {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Endereco e obrigatorio",
        ));
    }

    let document = body
        .document
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let email = body
        .email
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let id = Uuid::new_v4().to_string();
    let row: ClientRow = sqlx::query_as(
        r#"INSERT INTO clients (id, name, document, phone, address, email, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id, name, document, phone, address, email, "createdAt" AS created_at, "updatedAt" AS updated_at"#,
    )
    .bind(&id)
    .bind(name)
    .bind(document)
    .bind(phone)
    .bind(address)
    .bind(email)
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar cliente: {}", e)))?;

    let new_value = serde_json::json!({
        "name": row.name,
        "document": row.document,
        "phone": row.phone,
        "address": row.address,
        "email": row.email,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "create_client",
            entity_type: "client",
            entity_id: &row.id,
            description: &format!("Cliente cadastrado - {} ({})", row.name, row.phone),
            old_value: None,
            new_value: Some(&new_value),
        },
        &headers,
    )
    .await;

    Ok((StatusCode::CREATED, Json(ClientDto::from(row))))
}

async fn get_client(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ClientDetailDto>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let client: Option<ClientRow> = sqlx::query_as(
        r#"SELECT id, name, document, phone, address, email,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM clients WHERE id = $1"#,
    )
    .bind(&id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar cliente: {}", e),
        )
    })?;

    let client =
        client.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Cliente nao encontrado"))?;

    let quotes: Vec<QuoteDto> = sqlx::query_as::<_, QuoteRow>(
        r#"SELECT id, number, subtotal, discount, total, observations, status,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM quotes WHERE "clientId" = $1 ORDER BY "createdAt" DESC"#,
    )
    .bind(&id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar orcamentos: {}", e),
        )
    })?
    .into_iter()
    .map(QuoteDto::from)
    .collect();

    Ok(Json(ClientDetailDto {
        id: client.id,
        name: client.name,
        document: client.document,
        phone: client.phone,
        address: client.address,
        email: client.email,
        created_at: fmt_dt(client.created_at),
        updated_at: fmt_dt(client.updated_at),
        quotes,
    }))
}

async fn update_client(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<UpdateClientRequest>,
) -> Result<Json<ClientDto>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let existing: Option<ClientRow> = sqlx::query_as(
        r#"SELECT id, name, document, phone, address, email,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM clients WHERE id = $1"#,
    )
    .bind(&id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar cliente: {}", e),
        )
    })?;

    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Cliente nao encontrado"))?;

    let name = body
        .name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&existing.name)
        .to_string();
    let document = body
        .document
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .or(existing.document.clone());
    let phone = body
        .phone
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&existing.phone)
        .to_string();
    let address = body
        .address
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&existing.address)
        .to_string();
    let email = body
        .email
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .or(existing.email.clone());

    let row: ClientRow = sqlx::query_as(
        r#"UPDATE clients SET name = $1, document = $2, phone = $3, address = $4, email = $5, "updatedAt" = NOW()
           WHERE id = $6
           RETURNING id, name, document, phone, address, email, "createdAt" AS created_at, "updatedAt" AS updated_at"#,
    )
    .bind(&name)
    .bind(&document)
    .bind(&phone)
    .bind(&address)
    .bind(&email)
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar cliente: {}", e)))?;

    let mut changes: Vec<String> = Vec::new();
    if row.name != existing.name {
        changes.push(format!("Nome: \"{}\" -> \"{}\"", existing.name, row.name));
    }
    if row.phone != existing.phone {
        changes.push("Telefone alterado".to_string());
    }
    if row.document != existing.document {
        changes.push("CPF/CNPJ alterado".to_string());
    }
    if row.address != existing.address {
        changes.push("Endereco alterado".to_string());
    }
    if row.email != existing.email {
        changes.push("Email alterado".to_string());
    }

    if !changes.is_empty() {
        let old_value = serde_json::json!({
            "name": existing.name,
            "document": existing.document,
            "phone": existing.phone,
            "address": existing.address,
            "email": existing.email,
        });
        let new_value = serde_json::json!({
            "name": row.name,
            "document": row.document,
            "phone": row.phone,
            "address": row.address,
            "email": row.email,
        });
        write_audit_log(
            pool,
            AuditEntry {
                action: "update_client",
                entity_type: "client",
                entity_id: &row.id,
                description: &format!("Cliente atualizado - {}", changes.join(", ")),
                old_value: Some(&old_value),
                new_value: Some(&new_value),
            },
            &headers,
        )
        .await;
    }

    Ok(Json(ClientDto::from(row)))
}

async fn delete_client(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Success>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let counts: Option<(i64, i64)> = sqlx::query_as(
        r#"SELECT
              (SELECT COUNT(*) FROM quotes q WHERE q."clientId" = $1),
              (SELECT COUNT(*) FROM material_lists ml WHERE ml."clientId" = $1)"#,
    )
    .bind(&id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao verificar cliente: {}", e),
        )
    })?;

    let (quotes, material_lists) =
        counts.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Cliente nao encontrado"))?;

    if quotes > 0 {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Nao e possivel excluir cliente com orcamentos associados",
        ));
    }
    if material_lists > 0 {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Nao e possivel excluir cliente com listas de materiais associadas",
        ));
    }

    let client: Option<ClientRow> = sqlx::query_as(
        r#"SELECT id, name, document, phone, address, email,
                  "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM clients WHERE id = $1"#,
    )
    .bind(&id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar cliente: {}", e),
        )
    })?;

    let client =
        client.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Cliente nao encontrado"))?;

    let old_value = serde_json::json!({
        "name": client.name,
        "document": client.document,
        "phone": client.phone,
        "address": client.address,
        "email": client.email,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "delete_client",
            entity_type: "client",
            entity_id: &id,
            description: &format!("Cliente EXCLUIDO - {} ({})", client.name, client.phone),
            old_value: Some(&old_value),
            new_value: None,
        },
        &headers,
    )
    .await;

    sqlx::query("DELETE FROM clients WHERE id = $1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao excluir cliente: {}", e),
            )
        })?;

    Ok(Json(Success { success: true }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_clients).post(create_client))
        .route(
            "/{id}",
            get(get_client).put(update_client).delete(delete_client),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fmt_dt_formats_prisma_style() {
        let dt = NaiveDateTime::parse_from_str("2026-07-24T12:34:56.789", "%Y-%m-%dT%H:%M:%S%.f")
            .unwrap();
        assert_eq!(fmt_dt(dt), "2026-07-24T12:34:56.789Z");
    }

    #[test]
    fn fmt_dt_pads_millis() {
        let dt = NaiveDateTime::parse_from_str("2026-01-02T03:04:05", "%Y-%m-%dT%H:%M:%S").unwrap();
        assert_eq!(fmt_dt(dt), "2026-01-02T03:04:05.000Z");
    }

    #[test]
    fn fmt_dt_rounds_nanos_to_millis() {
        let dt =
            NaiveDateTime::parse_from_str("2026-05-06T07:08:09.123456", "%Y-%m-%dT%H:%M:%S%.f")
                .unwrap();
        assert_eq!(fmt_dt(dt), "2026-05-06T07:08:09.123Z");
    }
}
