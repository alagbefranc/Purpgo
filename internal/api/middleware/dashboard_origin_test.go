// Modified by Purpgo LLC.
package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/purpgo/purpgo/internal/config"
)

func TestDashboardOriginMiddleware(t *testing.T) {
	t.Setenv("APP_URL", "https://app.purpgo.com")
	t.Setenv("APP_ORIGIN", "")
	t.Setenv("CORS_ALLOW_ORIGINS", "https://tac-security-assessment.purpgo.com")
	r := gin.New()
	r.Use(DashboardOriginMiddleware())
	r.GET("/", func(c *gin.Context) { c.String(http.StatusOK, config.DashboardBaseURL(c.Request.Context())) })
	for _, tt := range []struct{ origin, want string }{
		{"https://tac-security-assessment.purpgo.com", "https://tac-security-assessment.purpgo.com"},
		{"https://evil.example.com", "https://app.purpgo.com"},
		{"", "https://app.purpgo.com"},
	} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Origin", tt.origin)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Body.String() != tt.want {
			t.Errorf("request origin %q returned %q", tt.origin, w.Body.String())
		}
	}
}
