// Modified by Purpgo LLC.
package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/purpgo/purpgo/internal/repository"
)

// runOrgSetCredits sets a workspace's monthly AI-credit allowance (set-to-N,
// like the monthly reset). Purchased top-ups are untouched.
func runOrgSetCredits(ctx context.Context, args []string) error {
	fs := newFlagSet("org set-credits")
	orgRef := fs.String("org", "", "organization id, slug, or owner email (required)")
	allowance := fs.Int("allowance", -1, "monthly credits to set (required, >= 0)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if err := noExtraArgs(fs); err != nil {
		return err
	}
	if *orgRef == "" || *allowance < 0 {
		return errors.New("--org and --allowance (>= 0) are required")
	}
	c, err := connect(ctx)
	if err != nil {
		return err
	}
	defer c.close()
	orgID, err := resolveOrgID(ctx, c, *orgRef)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("ctl_set_credits:%d:%d", *allowance, time.Now().UnixNano())
	l, err := repository.NewCreditRepository(c.db).ResetMonthly(ctx, orgID, *allowance, key)
	if err != nil {
		return fmt.Errorf("setting credits: %w", err)
	}
	fmt.Printf("%s: monthly allowance set to %d (total balance %d)\n", orgID, *allowance, l.Total())
	return nil
}
