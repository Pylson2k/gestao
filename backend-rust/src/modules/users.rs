use sqlx::PgPool;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const OWNER_USERNAME: &str = "gustavo";

/// Ids do proprietário cacheados por processo (single-tenant: nunca muda em runtime).
const OWNER_IDS_TTL: Duration = Duration::from_secs(60);

struct OwnerIdsCache {
    ids: Vec<String>,
    loaded_at: Instant,
}

static OWNER_IDS_CACHE: OnceLock<Mutex<OwnerIdsCache>> = OnceLock::new();

/// Resolve os ids reais do proprietário no banco (usuário 'gustavo').
/// Legado: `getOwnerDbUserIds()`.
/// Cacheado com TTL curto — evita 1 query por request em todos os módulos.
pub async fn owner_db_user_ids(pool: &PgPool) -> Vec<String> {
    let cache = OWNER_IDS_CACHE.get_or_init(|| {
        Mutex::new(OwnerIdsCache {
            ids: Vec::new(),
            loaded_at: Instant::now() - OWNER_IDS_TTL,
        })
    });

    {
        let guard = cache
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if guard.loaded_at.elapsed() < OWNER_IDS_TTL {
            return guard.ids.clone();
        }
    }

    let ids = sqlx::query_scalar::<_, String>("SELECT id FROM users WHERE username = $1")
        .bind(OWNER_USERNAME)
        .fetch_all(pool)
        .await
        .unwrap_or_default();

    let mut guard = cache
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    guard.ids = ids.clone();
    guard.loaded_at = Instant::now();
    ids
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
