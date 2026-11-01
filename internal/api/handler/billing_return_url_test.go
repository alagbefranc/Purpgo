// Modified by Purpgo LLC.
package handler

import (
	"context"
	"testing"

	"github.com/purpgo/purpgo/internal/config"
)

func TestBillingReturnURLUsesInitiatingDashboard(t *testing.T) {
	t.Setenv("APP_URL", "https://app.purpgo.com")
	t.Setenv("APP_ORIGIN", "")
	t.Setenv("CORS_ALLOW_ORIGINS", "https://tac-security-assessment.purpgo.com")
	const assessment = "https://tac-security-assessment.purpgo.com"
	const fallback = "/app/settings/billing"
	for _, tt := range []struct{ origin, raw, want string }{
		{assessment, assessment + "/app/settings/billing/ai-credits?topup=success", assessment + "/app/settings/billing/ai-credits?topup=success"},
		{assessment, "/app/settings/billing?checkout=done", assessment + "/app/settings/billing?checkout=done"},
		{assessment, "", assessment + fallback},
		{assessment, "https://app.purpgo.com" + fallback, assessment + fallback},
		{"", "https://app.purpgo.com" + fallback, "https://app.purpgo.com" + fallback},
		{"", assessment + fallback, "https://app.purpgo.com" + fallback},
		{"https://evil.example.com", "/app/settings/billing", "https://app.purpgo.com" + fallback},
	} {
		ctx := config.WithDashboardOrigin(context.Background(), tt.origin)
		if got := billingReturnURL(ctx, tt.raw, fallback); got != tt.want {
			t.Errorf("origin %q URL %q = %q, want %q", tt.origin, tt.raw, got, tt.want)
		}
	}
	ctx := config.WithDashboardOrigin(context.Background(), assessment)
	for _, raw := range []string{
		"https://evil.example.com/", "//evil.example.com", "/\\evil.example.com", "https://tac-security-assessment.purpgo.com.evil.example.com/",
		"https://evil@tac-security-assessment.purpgo.com/", "http://tac-security-assessment.purpgo.com/", "https://tac-security-assessment.purpgo.com:444/", "javascript:alert(1)", "/path\nother", "/%zz",
	} {
		if got := billingReturnURL(ctx, raw, fallback); got != assessment+fallback {
			t.Errorf("unsafe URL %q returned %q", raw, got)
		}
	}
}
