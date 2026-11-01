// Modified by Purpgo LLC.
package middleware

import (
	"github.com/purpgo/purpgo/internal/app/apikey"
	"github.com/purpgo/purpgo/internal/app/idempotency"
	"github.com/purpgo/purpgo/internal/app/oauth"
	"github.com/purpgo/purpgo/internal/app/organization"
	"github.com/purpgo/purpgo/internal/app/poollink"
	"github.com/purpgo/purpgo/internal/app/ratelimit"
	"github.com/purpgo/purpgo/internal/app/token"
	"github.com/purpgo/purpgo/internal/infrastructure/cache"
)

type Handler struct {
	TokenService        token.TokenService
	APIKeyService       apikey.APIKeyService
	IdempotencyService  idempotency.Service
	RateLimitService    ratelimit.RateLimitService
	OrganizationService organization.OrganizationService
	// OAuthService validates OAuth 2.1 bearer access tokens (nil-safe: when
	// unset, only JWT + API-key auth are accepted).
	OAuthService *oauth.Service
	// Cache backs the pre-login per-IP limiter, which cannot use
	// RateLimitService because that one is keyed on a user id that does not
	// exist yet.
	Cache *cache.Cache
	// PoolLinkService authenticates linked instances; nil-safe, routes answer 501.
	PoolLinkService poollink.Service
	// NodeCredentials verifies a fleet node's own credential on the node-only routes; nil admits none.
	NodeCredentials NodeCredentialVerifier
}
