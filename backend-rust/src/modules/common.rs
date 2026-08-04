use axum::{
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::NaiveDateTime;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::users::resolve_db_user_id;

/// Formata data no mesmo formato do Prisma (ISO8601 com millis e "Z").
/// As colunas do Prisma sao TIMESTAMP (sem timezone) armazenadas em UTC.
pub fn fmt_dt(dt: NaiveDateTime) -> String {
    dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

/// Formata data opcional no formato do Prisma (null quando ausente).
pub fn fmt_dt_opt(dt: Option<NaiveDateTime>) -> Option<String> {
    dt.map(fmt_dt)
}

#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub message: String,
}

impl ApiError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = Json(serde_json::json!({ "error": self.message }));
        (self.status, body).into_response()
    }
}

pub fn require_user(headers: &HeaderMap) -> Result<&str, ApiError> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "Usuario nao autenticado"))
}

fn metadata(headers: &HeaderMap) -> (Option<String>, Option<String>) {
    let ip = headers
        .get("x-forwarded-for")
        .or_else(|| headers.get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let ua = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    (ip, ua)
}

/// Auditoria best-effort: nunca falha a operação principal.
pub struct AuditEntry<'a> {
    pub action: &'a str,
    pub entity_type: &'a str,
    pub entity_id: &'a str,
    pub description: &'a str,
    pub old_value: Option<&'a serde_json::Value>,
    pub new_value: Option<&'a serde_json::Value>,
}

pub async fn write_audit_log(pool: &PgPool, entry: AuditEntry<'_>, headers: &HeaderMap) {
    let Some(db_user_id) = resolve_db_user_id(pool).await else {
        return;
    };
    let (ip, ua) = metadata(headers);
    let result = sqlx::query(
        r#"INSERT INTO audit_logs (id, "userId", action, "entityType", "entityId", description, "oldValue", "newValue", "ipAddress", "userAgent")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(db_user_id)
    .bind(entry.action)
    .bind(entry.entity_type)
    .bind(entry.entity_id)
    .bind(entry.description)
    .bind(entry.old_value.map(|v| v.to_string()))
    .bind(entry.new_value.map(|v| v.to_string()))
    .bind(ip)
    .bind(ua)
    .execute(pool)
    .await;
    if let Err(e) = result {
        tracing::warn!("audit log write failed: {}", e);
    }
}
