use axum::{
    extract::{Query, State},
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
struct CashClosingRow {
    id: String,
    user_id: String,
    period_type: String,
    start_date: NaiveDateTime,
    end_date: NaiveDateTime,
    total_profit: f64,
    company_cash: f64,
    gustavo_profit: f64,
    total_revenue: f64,
    total_expenses: f64,
    observations: Option<String>,
    created_at: NaiveDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CashClosingDto {
    id: String,
    user_id: String,
    period_type: String,
    start_date: String,
    end_date: String,
    total_profit: f64,
    company_cash: f64,
    gustavo_profit: f64,
    total_revenue: f64,
    total_expenses: f64,
    observations: Option<String>,
    created_at: String,
}

impl From<CashClosingRow> for CashClosingDto {
    fn from(c: CashClosingRow) -> Self {
        Self {
            id: c.id,
            user_id: c.user_id,
            period_type: c.period_type,
            start_date: fmt_dt(c.start_date),
            end_date: fmt_dt(c.end_date),
            total_profit: c.total_profit,
            company_cash: c.company_cash,
            gustavo_profit: c.gustavo_profit,
            total_revenue: c.total_revenue,
            total_expenses: c.total_expenses,
            observations: c.observations,
            created_at: fmt_dt(c.created_at),
        }
    }
}

#[derive(Deserialize)]
struct ListClosingsQuery {
    limit: Option<String>,
}

#[derive(Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct CashClosingPayload {
    period_type: Option<String>,
    start_date: Option<serde_json::Value>,
    end_date: Option<serde_json::Value>,
    total_profit: Option<serde_json::Value>,
    company_cash: Option<serde_json::Value>,
    gustavo_profit: Option<serde_json::Value>,
    total_revenue: Option<serde_json::Value>,
    total_expenses: Option<serde_json::Value>,
    observations: Option<String>,
}

async fn list_cash_closings(
    State(state): State<AppState>,
    Query(query): Query<ListClosingsQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<CashClosingDto>>, ApiError> {
    require_user(&headers)?;
    let pool = &state.db;

    let limit = query
        .limit
        .as_deref()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(50)
        .clamp(1, 500);

    let owner_ids = owner_db_user_ids(pool).await;

    let mut closings: Vec<CashClosingRow> = Vec::new();
    if !owner_ids.is_empty() {
        closings = sqlx::query_as(
            r#"SELECT id, "userId" AS user_id, "periodType" AS period_type,
                      "startDate" AS start_date, "endDate" AS end_date,
                      "totalProfit" AS total_profit, "companyCash" AS company_cash,
                      "gustavoProfit" AS gustavo_profit, "totalRevenue" AS total_revenue,
                      "totalExpenses" AS total_expenses, observations, "createdAt" AS created_at
               FROM cash_closings
               WHERE "userId" = ANY($1)
               ORDER BY "endDate" DESC
               LIMIT $2"#,
        )
        .bind(&owner_ids)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao buscar fechamentos: {}", e),
            )
        })?;
    }

    Ok(Json(
        closings.into_iter().map(CashClosingDto::from).collect(),
    ))
}

async fn create_cash_closing(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CashClosingPayload>,
) -> Result<Response, ApiError> {
    let _user_id = require_user(&headers)?;
    let pool = &state.db;

    let Some(db_user_id) = resolve_db_user_id(pool).await else {
        return Err(ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Falha ao mapear usuario autenticado",
        ));
    };

    let period_type = body
        .period_type
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::BAD_REQUEST,
                "Campos obrigatorios: periodType, startDate, endDate",
            )
        })?;

    let start_date = body
        .start_date
        .as_ref()
        .and_then(|v| v.as_str())
        .and_then(parse_date)
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::BAD_REQUEST,
                "Campos obrigatorios: periodType, startDate, endDate",
            )
        })?;

    let end_date = body
        .end_date
        .as_ref()
        .and_then(|v| v.as_str())
        .and_then(parse_date)
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::BAD_REQUEST,
                "Campos obrigatorios: periodType, startDate, endDate",
            )
        })?;

    if body.total_profit.is_none() || body.total_revenue.is_none() || body.total_expenses.is_none()
    {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Valores financeiros sao obrigatorios",
        ));
    }

    let total_profit = body
        .total_profit
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(0.0);
    let company_cash = body
        .company_cash
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(0.0);
    let gustavo_profit = body
        .gustavo_profit
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(0.0);
    let total_revenue = body
        .total_revenue
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(0.0);
    let total_expenses = body
        .total_expenses
        .as_ref()
        .and_then(parse_amount)
        .unwrap_or(0.0);

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
        "/v2/cash-closings",
        &headers,
        &idem_hash,
        || async move {
            let closing_id = Uuid::new_v4().to_string();
            let now = now_naive();

            sqlx::query(
                r#"INSERT INTO cash_closings (id, "userId", "periodType", "startDate", "endDate",
                       "totalProfit", "companyCash", "gustavoProfit", "totalRevenue", "totalExpenses",
                       observations, "createdAt")
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#,
            )
            .bind(&closing_id)
            .bind(db_user_id_ref)
            .bind(period_type)
            .bind(start_date)
            .bind(end_date)
            .bind(total_profit)
            .bind(company_cash)
            .bind(gustavo_profit)
            .bind(total_revenue)
            .bind(total_expenses)
            .bind(observations.as_deref())
            .bind(now)
            .execute(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao criar fechamento: {}", e),
                )
            })?;

            let row: CashClosingRow = sqlx::query_as(
                r#"SELECT id, "userId" AS user_id, "periodType" AS period_type,
                          "startDate" AS start_date, "endDate" AS end_date,
                          "totalProfit" AS total_profit, "companyCash" AS company_cash,
                          "gustavoProfit" AS gustavo_profit, "totalRevenue" AS total_revenue,
                          "totalExpenses" AS total_expenses, observations, "createdAt" AS created_at
                   FROM cash_closings WHERE id = $1"#,
            )
            .bind(&closing_id)
            .fetch_one(pool)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao buscar fechamento criado: {}", e),
                )
            })?;

            let dto = CashClosingDto::from(row);

            let description = format!(
                "💰 FECHAMENTO DE CAIXA {} - Período: {} a {} - Lucro Total: R$ {:.2} - Caixa Empresa: R$ {:.2} - Proprietario: R$ {:.2}",
                dto.period_type.to_uppercase(),
                start_date.format("%d/%m/%Y"),
                end_date.format("%d/%m/%Y"),
                dto.total_profit,
                dto.company_cash,
                dto.gustavo_profit,
            );
            let new_value = serde_json::json!({
                "periodType": dto.period_type,
                "startDate": dto.start_date,
                "endDate": dto.end_date,
                "totalProfit": dto.total_profit,
                "companyCash": dto.company_cash,
                "gustavoProfit": dto.gustavo_profit,
                "totalRevenue": dto.total_revenue,
                "totalExpenses": dto.total_expenses,
            });
            write_audit_log(
                pool,
                AuditEntry {
                    action: "create_cash_closing",
                    entity_type: "cash_closing",
                    entity_id: &closing_id,
                    description: &description,
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

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_cash_closings).post(create_cash_closing))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_amount_handles_number_and_string() {
        assert_eq!(parse_amount(&serde_json::json!(500)), Some(500.0));
        assert_eq!(parse_amount(&serde_json::json!("250.5")), Some(250.5));
        assert_eq!(parse_amount(&serde_json::json!("abc")), None);
        assert_eq!(parse_amount(&serde_json::json!(null)), None);
    }

    #[test]
    fn parse_date_accepts_iso_and_date_only() {
        assert!(parse_date("2026-08-01").is_some());
        assert!(parse_date("2026-08-01T10:00:00").is_some());
        assert!(parse_date("2026-08-01T10:00:00Z").is_some());
        assert!(parse_date("invalido").is_none());
    }

    #[test]
    fn required_financial_fields_are_checked() {
        let body = CashClosingPayload::default();
        assert!(body.total_profit.is_none());
        assert!(body.total_revenue.is_none());
        assert!(body.total_expenses.is_none());
    }
}
