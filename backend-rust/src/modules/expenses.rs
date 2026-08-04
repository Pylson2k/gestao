use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::modules::common::{
    fmt_dt, request_hash, require_user, run_with_idempotency, write_audit_log, ApiError, AuditEntry,
};
use crate::modules::users::{owner_db_user_ids, resolve_db_user_id};
use crate::state::AppState;

fn parse_amount(value: &serde_json::Value) -> Option<f64> {
    let n = match value {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.trim().parse::<f64>().ok(),
        _ => None,
    };
    n.filter(|v| v.is_finite())
}

fn parse_date(s: &str) -> Option<NaiveDateTime> {
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
struct ExpenseRow {
    id: String,
    user_id: String,
    category: String,
    description: String,
    amount: f64,
    date: NaiveDateTime,
    observations: Option<String>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExpenseDto {
    id: String,
    user_id: String,
    category: String,
    description: String,
    amount: f64,
    date: String,
    observations: Option<String>,
    created_at: String,
    updated_at: String,
}

impl From<ExpenseRow> for ExpenseDto {
    fn from(e: ExpenseRow) -> Self {
        Self {
            id: e.id,
            user_id: e.user_id,
            category: e.category,
            description: e.description,
            amount: e.amount,
            date: fmt_dt(e.date),
            observations: e.observations,
            created_at: fmt_dt(e.created_at),
            updated_at: fmt_dt(e.updated_at),
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListExpensesQuery {
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>,
}

#[derive(Deserialize, Serialize, Default)]
struct ExpensePayload {
    category: Option<String>,
    description: Option<String>,
    amount: Option<serde_json::Value>,
    date: Option<serde_json::Value>,
    observations: Option<String>,
}

#[derive(Serialize)]
struct Success {
    success: bool,
}

async fn list_expenses(
    State(state): State<AppState>,
    Query(query): Query<ListExpensesQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<ExpenseDto>>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;

    let start_filter = query
        .start_date
        .as_deref()
        .and_then(|s| parse_date(s).map(|d| d.date().and_hms_opt(0, 0, 0).unwrap_or(d)));
    let end_filter = query
        .end_date
        .as_deref()
        .and_then(|s| parse_date(&format!("{}T23:59:59", s)));

    let mut expenses: Vec<ExpenseRow> = Vec::new();
    if !owner_ids.is_empty() {
        expenses = sqlx::query_as(
            r#"SELECT id, "userId" AS user_id, category, description, amount, date,
                      observations, "createdAt" AS created_at, "updatedAt" AS updated_at
               FROM expenses
               WHERE "userId" = ANY($1)
                 AND ($2::timestamp IS NULL OR date >= $2)
                 AND ($3::timestamp IS NULL OR date <= $3)
                 AND ($4::text IS NULL OR category = $4)
               ORDER BY date DESC"#,
        )
        .bind(&owner_ids)
        .bind(start_filter)
        .bind(end_filter)
        .bind(&query.category)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao buscar despesas: {}", e),
            )
        })?;
    }

    Ok(Json(expenses.into_iter().map(ExpenseDto::from).collect()))
}

async fn get_expense(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ExpenseDto>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;

    let expense: Option<ExpenseRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, category, description, amount, date,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM expenses WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar despesa: {}", e),
        )
    })?;

    let expense =
        expense.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Despesa nao encontrada"))?;
    Ok(Json(ExpenseDto::from(expense)))
}

async fn create_expense(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ExpensePayload>,
) -> Result<Response, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let Some(db_user_id) = resolve_db_user_id(pool).await else {
        return Err(ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Falha ao mapear usuario autenticado",
        ));
    };

    let category = body
        .category
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::BAD_REQUEST,
                "Campos obrigatorios: category, amount, date",
            )
        })?;

    let amount_value = body.amount.as_ref().ok_or_else(|| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "Campos obrigatorios: category, amount, date",
        )
    })?;
    let amount = parse_amount(amount_value)
        .filter(|n| *n > 0.0)
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "O valor deve ser maior que zero"))?;

    let date_value = body.date.as_ref().ok_or_else(|| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "Campos obrigatorios: category, amount, date",
        )
    })?;
    let date_str = date_value.as_str().ok_or_else(|| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "Campos obrigatorios: category, amount, date",
        )
    })?;
    let date = parse_date(date_str).ok_or_else(|| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "Campos obrigatorios: category, amount, date",
        )
    })?;

    let description = body
        .description
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(category)
        .to_string();
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
        "/v2/expenses",
        &headers,
        &idem_hash,
        || async move {
            let expense_id = Uuid::new_v4().to_string();
            let now = now_naive();

            sqlx::query(
                r#"INSERT INTO expenses (id, "userId", category, description, amount, date, observations, "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            )
            .bind(&expense_id)
            .bind(db_user_id_ref)
            .bind(category)
            .bind(&description)
            .bind(amount)
            .bind(date)
            .bind(observations.as_deref())
            .bind(now)
            .bind(now)
            .execute(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao criar despesa: {}", e),
                )
            })?;

            let row: ExpenseRow = sqlx::query_as(
                r#"SELECT id, "userId" AS user_id, category, description, amount, date,
                          observations, "createdAt" AS created_at, "updatedAt" AS updated_at
                   FROM expenses WHERE id = $1"#,
            )
            .bind(&expense_id)
            .fetch_one(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao buscar despesa criada: {}", e),
                )
            })?;

            let dto = ExpenseDto::from(row);

            let is_vale = dto.category.contains("vale");
            let description_text = if is_vale {
                format!(
                    "💰 VALE CRIADO - {}: {} - Valor: R$ {:.2}",
                    dto.category, dto.description, dto.amount
                )
            } else {
                format!(
                    "Despesa criada - {}: {} - Valor: R$ {:.2}",
                    dto.category, dto.description, dto.amount
                )
            };
            let new_value = serde_json::json!({
                "category": dto.category,
                "description": dto.description,
                "amount": dto.amount,
                "date": dto.date,
            });
            write_audit_log(
                pool,
                AuditEntry {
                    action: "create_expense",
                    entity_type: "expense",
                    entity_id: &expense_id,
                    description: &description_text,
                    old_value: None,
                    new_value: Some(&new_value),
                },
                headers_ref,
            )
            .await;

            Ok((StatusCode::CREATED, Json(dto)).into_response())
        },
    )
    .await
}

async fn update_expense(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<ExpensePayload>,
) -> Result<Json<ExpenseDto>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;

    let existing: Option<ExpenseRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, category, description, amount, date,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM expenses WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar despesa: {}", e),
        )
    })?;

    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Despesa nao encontrada"))?;

    if let Some(value) = body.amount.as_ref() {
        if parse_amount(value).map(|n| n <= 0.0).unwrap_or(true) {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "O valor deve ser maior que zero",
            ));
        }
    }

    let category = match body.category.as_deref() {
        Some(v) => v.to_string(),
        None => existing.category.clone(),
    };
    let description = match body.description.as_deref() {
        Some(v) if !v.trim().is_empty() => v.trim().to_string(),
        Some(_) => category.clone(),
        None => existing.description.clone(),
    };
    let amount = body
        .amount
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(existing.amount);
    let date = match body.date.as_ref() {
        Some(v) => v
            .as_str()
            .and_then(parse_date)
            .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Data invalida"))?,
        None => existing.date,
    };
    let observations = match body.observations.as_deref() {
        Some(v) if !v.trim().is_empty() => Some(v.trim().to_string()),
        Some(_) => None,
        None => existing.observations.clone(),
    };

    sqlx::query(
        r#"UPDATE expenses
           SET category = $1, description = $2, amount = $3, date = $4, observations = $5, "updatedAt" = NOW()
           WHERE id = $6"#,
    )
    .bind(&category)
    .bind(&description)
    .bind(amount)
    .bind(date)
    .bind(observations.as_deref())
    .bind(&id)
    .execute(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao atualizar despesa: {}", e),
        )
    })?;

    let row: ExpenseRow = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, category, description, amount, date,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM expenses WHERE id = $1"#,
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar despesa atualizada: {}", e),
        )
    })?;

    let dto = ExpenseDto::from(row);

    let mut changes: Vec<String> = Vec::new();
    if dto.amount != existing.amount {
        changes.push(format!(
            "Valor: R$ {:.2} → R$ {:.2}",
            existing.amount, dto.amount
        ));
    }
    if dto.category != existing.category {
        changes.push(format!(
            "Categoria: {} → {}",
            existing.category, dto.category
        ));
    }
    if dto.description != existing.description {
        changes.push("Descrição alterada".to_string());
    }
    if dto.date != fmt_dt(existing.date) {
        changes.push("Data alterada".to_string());
    }

    if !changes.is_empty() {
        let is_vale = existing.category.contains("vale") || dto.category.contains("vale");
        let description_text = if is_vale {
            format!("💰 VALE ATUALIZADO - {}", changes.join(", "))
        } else {
            format!("Despesa atualizada - {}", changes.join(", "))
        };
        let old_value = serde_json::json!({
            "category": existing.category,
            "description": existing.description,
            "amount": existing.amount,
            "date": fmt_dt(existing.date),
        });
        let new_value = serde_json::json!({
            "category": dto.category,
            "description": dto.description,
            "amount": dto.amount,
            "date": dto.date,
        });
        write_audit_log(
            pool,
            AuditEntry {
                action: "update_expense",
                entity_type: "expense",
                entity_id: &id,
                description: &description_text,
                old_value: Some(&old_value),
                new_value: Some(&new_value),
            },
            &headers,
        )
        .await;
    }

    Ok(Json(dto))
}

async fn delete_expense(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Success>, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let owner_ids = owner_db_user_ids(pool).await;

    let expense: Option<ExpenseRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, category, description, amount, date,
                  observations, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM expenses WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&owner_ids)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar despesa: {}", e),
        )
    })?;

    let expense =
        expense.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Despesa nao encontrada"))?;

    let is_vale = expense.category.contains("vale");
    let is_large = expense.amount > 1000.0;
    let description = if is_vale {
        format!(
            "💰⚠️ VALE EXCLUÍDO - {}: {} - Valor: R$ {:.2}",
            expense.category, expense.description, expense.amount
        )
    } else if is_large {
        format!(
            "⚠️ EXCLUSÃO DE DESPESA DE VALOR ALTO - {}: {} - Valor: R$ {:.2}",
            expense.category, expense.description, expense.amount
        )
    } else {
        format!(
            "Despesa EXCLUÍDA - {}: {} - Valor: R$ {:.2}",
            expense.category, expense.description, expense.amount
        )
    };
    let old_value = serde_json::json!({
        "category": expense.category,
        "description": expense.description,
        "amount": expense.amount,
        "date": fmt_dt(expense.date),
    });

    write_audit_log(
        pool,
        AuditEntry {
            action: "delete_expense",
            entity_type: "expense",
            entity_id: &id,
            description: &description,
            old_value: Some(&old_value),
            new_value: None,
        },
        &headers,
    )
    .await;

    sqlx::query("DELETE FROM expenses WHERE id = $1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao excluir despesa: {}", e),
            )
        })?;

    Ok(Json(Success { success: true }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_expenses).post(create_expense))
        .route(
            "/{id}",
            get(get_expense).put(update_expense).delete(delete_expense),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_amount_handles_number_and_string() {
        assert_eq!(parse_amount(&serde_json::json!(100)), Some(100.0));
        assert_eq!(parse_amount(&serde_json::json!("12,5")), None);
        assert_eq!(parse_amount(&serde_json::json!("12.5")), Some(12.5));
        assert_eq!(parse_amount(&serde_json::json!(null)), None);
        assert_eq!(parse_amount(&serde_json::json!(0)), Some(0.0));
    }

    #[test]
    fn parse_date_accepts_iso_and_date_only() {
        assert!(parse_date("2026-08-01").is_some());
        assert!(parse_date("2026-08-01T10:00:00").is_some());
        assert!(parse_date("2026-08-01T10:00:00Z").is_some());
        assert!(parse_date("invalido").is_none());
    }
}
