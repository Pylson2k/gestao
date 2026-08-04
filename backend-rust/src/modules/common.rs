use axum::{
    body::{to_bytes, Body},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::NaiveDateTime;
use sqlx::PgPool;
use std::collections::hash_map::DefaultHasher;
use std::future::Future;
use std::hash::{Hash, Hasher};
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

pub const DEFAULT_MATERIAL_UNIT: &str = "unidade";

pub const MATERIAL_UNITS: [&str; 12] = [
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
pub fn resolve_material_unit(raw: Option<&str>) -> String {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        Some(t) if MATERIAL_UNITS.contains(&t) => t.to_string(),
        _ => DEFAULT_MATERIAL_UNIT.to_string(),
    }
}

/// Interpreta texto/número de quantidade (espelha `parseQuantityInput`).
pub fn parse_quantity_input(raw: &str) -> Option<f64> {
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

pub fn normalize_stored_quantity(parsed: f64) -> f64 {
    if parsed.is_finite() && parsed > 0.0 {
        (parsed * 10000.0).round() / 10000.0
    } else {
        1.0
    }
}

pub fn resolve_material_quantity(raw: &serde_json::Value) -> f64 {
    match raw {
        serde_json::Value::Number(n) => n.as_f64().map(normalize_stored_quantity),
        serde_json::Value::String(s) => Some(normalize_stored_quantity(
            parse_quantity_input(s).unwrap_or(1.0),
        )),
        _ => None,
    }
    .unwrap_or(1.0)
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

pub fn is_unique_violation(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::Database(db) => db.code().as_deref() == Some("23505"),
        _ => false,
    }
}

/// Hash estável do payload enviado pelo cliente (para detectar reuso de chave com corpo diferente).
pub fn request_hash<T: serde::Serialize>(value: &T) -> String {
    let mut hasher = DefaultHasher::new();
    serde_json::to_string(value)
        .unwrap_or_default()
        .hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Executa uma operação de escrita com idempotência baseada no header `Idempotency-Key`.
///
/// - Sem header: executa normalmente (sem persistir nada).
/// - Com header e chave já armazenada com o mesmo payload: replay da resposta original.
/// - Com header e chave já armazenada com payload diferente: 409 Conflict.
/// - Com header novo: executa e, em caso de sucesso (2xx), armazena status + body para replay.
pub async fn run_with_idempotency<F, Fut>(
    pool: &PgPool,
    user_id: &str,
    route: &str,
    headers: &HeaderMap,
    request_hash: &str,
    op: F,
) -> Result<Response, ApiError>
where
    F: FnOnce() -> Fut,
    Fut: Future<Output = Result<Response, ApiError>>,
{
    let idempotency_key = headers
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let Some(key) = idempotency_key else {
        return op().await;
    };

    let stored: Option<(i32, String, String)> = sqlx::query_as(
        r#"SELECT "statusCode", "requestHash", "responseBody"::text
             FROM idempotency_keys
            WHERE "key" = $1 AND "userId" = $2"#,
    )
    .bind(key)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao consultar chave de idempotencia: {e}"),
        )
    })?;

    if let Some((status, stored_hash, body)) = stored {
        if stored_hash != request_hash {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "Chave de idempotencia ja utilizada com um payload diferente",
            ));
        }
        let value: serde_json::Value = serde_json::from_str(&body).map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Resposta armazenada invalida: {e}"),
            )
        })?;
        let status = StatusCode::from_u16(status as u16).unwrap_or(StatusCode::OK);
        return Ok((status, Json(value)).into_response());
    }

    let result = op().await;

    match result {
        Err(e) => Err(e),
        Ok(response) => {
            let status = response.status().as_u16();
            if !(200..300).contains(&status) {
                return Ok(response);
            }

            let (parts, body) = response.into_parts();
            let bytes = match to_bytes(body, 2 * 1024 * 1024).await {
                Ok(b) => b,
                Err(e) => {
                    tracing::warn!("idempotency: falha ao ler corpo da resposta: {e}");
                    return Ok(Response::from_parts(parts, Body::empty()));
                }
            };

            let body_str = String::from_utf8_lossy(&bytes).into_owned();
            let insert = sqlx::query(
                r#"INSERT INTO idempotency_keys ("key", "userId", "route", "requestHash", "statusCode", "responseBody")
                   VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                   ON CONFLICT ("key", "userId") DO NOTHING"#,
            )
            .bind(key)
            .bind(user_id)
            .bind(route)
            .bind(request_hash)
            .bind(status as i32)
            .bind(&body_str)
            .execute(pool)
            .await;
            if let Err(e) = insert {
                tracing::warn!("idempotency: falha ao armazenar resultado: {e}");
            }

            Ok(Response::from_parts(parts, Body::from(bytes)))
        }
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fmt_dt_formats_prisma_style() {
        let dt = NaiveDateTime::parse_from_str("2026-08-01 10:00:00", "%Y-%m-%d %H:%M:%S").unwrap();
        assert_eq!(fmt_dt(dt), "2026-08-01T10:00:00.000Z");
    }

    #[test]
    fn fmt_dt_pads_millis() {
        let dt =
            NaiveDateTime::parse_from_str("2026-08-01 10:00:00.5", "%Y-%m-%d %H:%M:%S%.f").unwrap();
        assert_eq!(fmt_dt(dt), "2026-08-01T10:00:00.500Z");
    }

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
}
