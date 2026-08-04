use sqlx::PgPool;

const OWNER_USERNAME: &str = "gustavo";

/// Resolve os ids reais do proprietário no banco (usuário 'gustavo').
/// Legado: `getOwnerDbUserIds()`.
pub async fn owner_db_user_ids(pool: &PgPool) -> Vec<String> {
    sqlx::query_scalar::<_, String>("SELECT id FROM users WHERE username = $1")
        .bind(OWNER_USERNAME)
        .fetch_all(pool)
        .await
        .unwrap_or_default()
}

/// Resolve o id real do proprietário no banco (primeiro match).
/// Legado: `getDbUserId(session_id)`.
pub async fn resolve_db_user_id(pool: &PgPool) -> Option<String> {
    owner_db_user_ids(pool).await.into_iter().next()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn owner_username_is_gustavo() {
        assert_eq!(OWNER_USERNAME, "gustavo");
    }
}
