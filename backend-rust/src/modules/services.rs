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
use crate::modules::users::owner_db_user_ids;
use crate::state::AppState;

#[derive(FromRow)]
struct ServiceRow {
    id: String,
    user_id: String,
    name: String,
    description: Option<String>,
    unit_price: f64,
    unit: String,
    is_active: bool,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceDto {
    id: String,
    user_id: String,
    name: String,
    description: Option<String>,
    unit_price: f64,
    unit: String,
    is_active: bool,
    created_at: String,
    updated_at: String,
}

impl From<ServiceRow> for ServiceDto {
    fn from(s: ServiceRow) -> Self {
        Self {
            id: s.id,
            user_id: s.user_id,
            name: s.name,
            description: s.description,
            unit_price: s.unit_price,
            unit: s.unit,
            is_active: s.is_active,
            created_at: fmt_dt(s.created_at),
            updated_at: fmt_dt(s.updated_at),
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceQuery {
    is_active: Option<String>,
    search: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateServiceRequest {
    name: String,
    description: Option<String>,
    unit_price: Option<serde_json::Value>,
    unit: Option<String>,
    is_active: Option<bool>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct UpdateServiceRequest {
    name: Option<String>,
    description: Option<String>,
    unit_price: Option<serde_json::Value>,
    unit: Option<String>,
    is_active: Option<bool>,
}

#[derive(Serialize)]
struct Success {
    success: bool,
}

/// Converte o valor de unitPrice (número ou string numérica) para f64.
fn parse_unit_price(value: &serde_json::Value) -> Option<f64> {
    match value {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.trim().parse::<f64>().ok(),
        _ => None,
    }
}

async fn list_services(
    State(state): State<AppState>,
    Query(query): Query<ServiceQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<ServiceDto>>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    let is_active = query.is_active.as_deref().map(|v| v == "true");

    let mut rows: Vec<ServiceRow> = Vec::new();
    if !owner_ids.is_empty() {
        rows = sqlx::query_as(
            r#"SELECT id, "userId" AS user_id, name, description, "unitPrice" AS unit_price,
                      unit, "isActive" AS is_active,
                      "createdAt" AS created_at, "updatedAt" AS updated_at
               FROM services
               WHERE "userId" = ANY($1)
                 AND ($2::boolean IS NULL OR "isActive" = $2)
                 AND ($3::text IS NULL
                      OR name ILIKE '%' || $3 || '%'
                      OR description ILIKE '%' || $3 || '%')
               ORDER BY "createdAt" DESC"#,
        )
        .bind(&owner_ids)
        .bind(is_active)
        .bind(&query.search)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao buscar servicos: {}", e),
            )
        })?;
    }

    Ok(Json(rows.into_iter().map(ServiceDto::from).collect()))
}

async fn create_service(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateServiceRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let name = body.name.trim();
    if name.is_empty() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Nome e obrigatorio"));
    }

    let Some(db_user_id) = super::users::resolve_db_user_id(pool).await else {
        return Err(ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Falha ao mapear usuario autenticado",
        ));
    };

    let unit_price = match body.unit_price.as_ref() {
        Some(v) => {
            let parsed = parse_unit_price(v).unwrap_or(f64::NAN);
            if !parsed.is_finite() || parsed < 0.0 {
                return Err(ApiError::new(
                    StatusCode::BAD_REQUEST,
                    "Preco unitario deve ser maior ou igual a zero",
                ));
            }
            parsed
        }
        None => {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "Preco unitario deve ser maior ou igual a zero",
            ))
        }
    };

    let description = body
        .description
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let unit = body
        .unit
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("unidade")
        .to_string();
    let is_active = body.is_active.unwrap_or(true);

    let id = Uuid::new_v4().to_string();
    let row: ServiceRow = sqlx::query_as(
        r#"INSERT INTO services (id, "userId", name, description, "unitPrice", unit, "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id, "userId" AS user_id, name, description, "unitPrice" AS unit_price,
                     unit, "isActive" AS is_active, "createdAt" AS created_at, "updatedAt" AS updated_at"#,
    )
    .bind(&id)
    .bind(&db_user_id)
    .bind(name)
    .bind(description)
    .bind(unit_price)
    .bind(&unit)
    .bind(is_active)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao criar servico: {}", e),
        )
    })?;

    let new_value = serde_json::json!({
        "name": row.name,
        "unitPrice": row.unit_price,
        "unit": row.unit,
        "isActive": row.is_active,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "create_service",
            entity_type: "service",
            entity_id: &row.id,
            description: &format!(
                "Servico cadastrado - {} - Preco: R$ {:.2}/{}",
                row.name, row.unit_price, row.unit
            ),
            old_value: None,
            new_value: Some(&new_value),
        },
        &headers,
    )
    .await;

    Ok((StatusCode::CREATED, Json(ServiceDto::from(row))))
}

async fn get_service(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ServiceDto>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    if owner_ids.is_empty() {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "Servico nao encontrado",
        ));
    }

    let service: Option<ServiceRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, name, description, "unitPrice" AS unit_price,
                  unit, "isActive" AS is_active, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM services WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar servico: {}", e),
        )
    })?;

    let service =
        service.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Servico nao encontrado"))?;

    Ok(Json(ServiceDto::from(service)))
}

async fn update_service(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<UpdateServiceRequest>,
) -> Result<Json<ServiceDto>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;
    if owner_ids.is_empty() {
        return Err(ApiError::new(
            StatusCode::NOT_FOUND,
            "Servico nao encontrado",
        ));
    }

    let existing: Option<ServiceRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, name, description, "unitPrice" AS unit_price,
                  unit, "isActive" AS is_active, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM services WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar servico: {}", e),
        )
    })?;

    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Servico nao encontrado"))?;

    let name = body
        .name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&existing.name)
        .to_string();
    let description = body
        .description
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .or(existing.description.clone());
    let unit = body
        .unit
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&existing.unit)
        .to_string();
    let is_active = body.is_active.unwrap_or(existing.is_active);

    let unit_price = match body.unit_price.as_ref() {
        Some(v) => {
            let parsed = parse_unit_price(v).unwrap_or(f64::NAN);
            if !parsed.is_finite() || parsed < 0.0 {
                return Err(ApiError::new(
                    StatusCode::BAD_REQUEST,
                    "Preco unitario deve ser maior ou igual a zero",
                ));
            }
            parsed
        }
        None => existing.unit_price,
    };

    let row: ServiceRow = sqlx::query_as(
        r#"UPDATE services
           SET name = $1, description = $2, "unitPrice" = $3, unit = $4, "isActive" = $5, "updatedAt" = NOW()
           WHERE id = $6
           RETURNING id, "userId" AS user_id, name, description, "unitPrice" AS unit_price,
                     unit, "isActive" AS is_active, "createdAt" AS created_at, "updatedAt" AS updated_at"#,
    )
    .bind(&name)
    .bind(&description)
    .bind(unit_price)
    .bind(&unit)
    .bind(is_active)
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao atualizar servico: {}", e),
        )
    })?;

    let mut changes: Vec<String> = Vec::new();
    if body.name.is_some() && existing.name != row.name {
        changes.push(format!("Nome: \"{}\" -> \"{}\"", existing.name, row.name));
    }
    if body.unit_price.is_some() && existing.unit_price != row.unit_price {
        changes.push(format!(
            "Preco: R$ {:.2} -> R$ {:.2}",
            existing.unit_price, row.unit_price
        ));
    }
    if body.is_active.is_some() && existing.is_active != row.is_active {
        changes.push(format!(
            "Status: {}",
            if row.is_active {
                "Ativado"
            } else {
                "Desativado"
            }
        ));
    }

    if !changes.is_empty() {
        let old_value = serde_json::json!({
            "name": existing.name,
            "unitPrice": existing.unit_price,
            "unit": existing.unit,
            "isActive": existing.is_active,
        });
        let new_value = serde_json::json!({
            "name": row.name,
            "unitPrice": row.unit_price,
            "unit": row.unit,
            "isActive": row.is_active,
        });
        write_audit_log(
            pool,
            AuditEntry {
                action: "update_service",
                entity_type: "service",
                entity_id: &row.id,
                description: &format!("Servico atualizado - {}", changes.join(", ")),
                old_value: Some(&old_value),
                new_value: Some(&new_value),
            },
            &headers,
        )
        .await;
    }

    Ok(Json(ServiceDto::from(row)))
}

async fn delete_service(
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
            "Servico nao encontrado",
        ));
    }

    let service: Option<ServiceRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, name, description, "unitPrice" AS unit_price,
                  unit, "isActive" AS is_active, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM services WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar servico: {}", e),
        )
    })?;

    let service =
        service.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Servico nao encontrado"))?;

    let old_value = serde_json::json!({
        "name": service.name,
        "unitPrice": service.unit_price,
        "unit": service.unit,
        "isActive": service.is_active,
    });
    write_audit_log(
        pool,
        AuditEntry {
            action: "delete_service",
            entity_type: "service",
            entity_id: &id,
            description: &format!(
                "Servico EXCLUIDO - {} - Preco: R$ {:.2}/{}",
                service.name, service.unit_price, service.unit
            ),
            old_value: Some(&old_value),
            new_value: None,
        },
        &headers,
    )
    .await;

    sqlx::query("DELETE FROM services WHERE id = $1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao excluir servico: {}", e),
            )
        })?;

    Ok(Json(Success { success: true }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_services).post(create_service))
        .route(
            "/{id}",
            get(get_service).put(update_service).delete(delete_service),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_unit_price_accepts_number_and_string() {
        assert_eq!(parse_unit_price(&serde_json::json!(42.5)), Some(42.5));
        assert_eq!(parse_unit_price(&serde_json::json!("55")), Some(55.0));
        assert_eq!(parse_unit_price(&serde_json::json!("1.999")), Some(1.999));
    }

    #[test]
    fn parse_unit_price_rejects_invalid() {
        assert_eq!(parse_unit_price(&serde_json::json!("abc")), None);
        assert_eq!(parse_unit_price(&serde_json::json!(null)), None);
        assert_eq!(parse_unit_price(&serde_json::Value::Bool(true)), None);
    }
}
