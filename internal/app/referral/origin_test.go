// Modified by Purpgo LLC.
package referral

import (
	"context"
	"testing"

	"github.com/purpgo/purpgo/internal/config"
)

func TestReferralShareLinkUsesTrustedDashboard(t *testing.T) {
	t.Setenv("APP_URL", "https://app.purpgo.com")
	t.Setenv("APP_ORIGIN", "")
	t.Setenv("CORS_ALLOW_ORIGINS", "https://tac-security-assessment.purpgo.com")
	s := &service{shareBase: "https://app.purpgo.com"}
	for _, tt := range []struct{ origin, want string }{
		{"https://tac-security-assessment.purpgo.com", "https://tac-security-assessment.purpgo.com"},
		{"", "https://app.purpgo.com"},
		{"https://evil.example.com", "https://app.purpgo.com"},
	} {
		ctx := config.WithDashboardOrigin(context.Background(), tt.origin)
		if got := s.shareURL(ctx, "CODE1234"); got != tt.want+"/auth/register?ref=CODE1234" {
			t.Fatalf("share link = %q", got)
		}
	}
}
