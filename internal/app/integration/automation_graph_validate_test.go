package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/warmbly/warmbly/internal/models"
	"github.com/warmbly/warmbly/internal/repository"
)

// graphRepo stubs the connection lookup validateAutomationGraph makes once a
// step already names a connection. Every other method stays on the embedded
// interface and is not called by these tests.
type graphRepo struct {
	repository.IntegrationRepository
	conn *models.IntegrationConnection
}

func (r graphRepo) GetConnectionByID(context.Context, uuid.UUID, uuid.UUID) (*models.IntegrationConnection, error) {
	return r.conn, nil
}

func TestValidateAutomationGraph_DraftTemplates(t *testing.T) {
	s := &service{}
	ctx := context.Background()
	orgID := uuid.New()

	slack := slackPositiveReplyGraph(nil)
	if err := s.validateAutomationGraph(ctx, orgID, slack, false); err != nil {
		t.Fatalf("disabled slack template: %v", err)
	}
	err := s.validateAutomationGraph(ctx, orgID, slack, true)
	if err == nil || !strings.Contains(err.Error(), "no integration selected") {
		t.Fatalf("enabled slack template without a connection: %v", err)
	}

	deal := linearGraph(models.IntegrationActionCreateDeal, json.RawMessage(`{"deal_name":"{{.invitee_name}} - {{.event_name}}"}`))
	if err := s.validateAutomationGraph(ctx, orgID, deal, false); err != nil {
		t.Fatalf("disabled deal template: %v", err)
	}
	if err := s.validateAutomationGraph(ctx, orgID, deal, true); err == nil {
		t.Fatal("enabled deal template without a pipeline was accepted")
	}

	tag := linearGraph(models.IntegrationActionAddTag, json.RawMessage(`{}`))
	if err := s.validateAutomationGraph(ctx, orgID, tag, false); err != nil {
		t.Fatalf("disabled tag template: %v", err)
	}
	if err := s.validateAutomationGraph(ctx, orgID, tag, true); err == nil {
		t.Fatal("enabled tag template without a tag was accepted")
	}

	// Unsubscribe needs no extra config, so it can be created already on.
	unsub := linearGraph(models.IntegrationActionUnsubscribe, json.RawMessage(`{}`))
	if err := s.validateAutomationGraph(ctx, orgID, unsub, true); err != nil {
		t.Fatalf("enabled unsubscribe template: %v", err)
	}
}

func TestValidateAutomationGraph_ChosenConnectionStillCheckedWhenDisabled(t *testing.T) {
	orgID := uuid.New()
	connID := uuid.New()
	ctx := context.Background()

	slackSvc := &service{repo: graphRepo{conn: &models.IntegrationConnection{
		ID: connID, OrganizationID: orgID, Provider: models.IntegrationSlack,
	}}}
	if err := slackSvc.validateAutomationGraph(ctx, orgID, slackPositiveReplyGraph(&connID), false); err != nil {
		t.Fatalf("draft with the org's Slack connection: %v", err)
	}
	if err := slackSvc.validateAutomationGraph(ctx, orgID, slackPositiveReplyGraph(&connID), true); err != nil {
		t.Fatalf("enabled with the org's Slack connection: %v", err)
	}

	mismatch := &service{repo: graphRepo{conn: &models.IntegrationConnection{
		ID: connID, OrganizationID: orgID, Provider: models.IntegrationHubSpot,
	}}}
	err := mismatch.validateAutomationGraph(ctx, orgID, slackPositiveReplyGraph(&connID), false)
	if !errors.Is(err, ErrActionProviderMismatch) {
		t.Fatalf("draft with the wrong provider: %v", err)
	}
}

// slackPositiveReplyGraph is the "Slack on positive reply" template: a positive
// intent check, then slack.notify with only a message template.
func slackPositiveReplyGraph(connID *uuid.UUID) models.AutomationGraph {
	return models.AutomationGraph{
		Nodes: []models.AutomationNode{
			{ID: "trigger", Type: models.AutomationNodeTrigger},
			{ID: "c1", Type: models.AutomationNodeCondition, Condition: &models.AutomationCondition{
				Field: models.AutoCondField, Key: "intent", Operator: models.AutoOpEquals, Value: "positive",
			}},
			{ID: "a1", Type: models.AutomationNodeAction, Action: models.IntegrationActionSlackNotify, ConnectionID: connID,
				Config: json.RawMessage(`{"message_template":"Positive reply from {{.contact_email}}"}`)},
		},
		Edges: []models.AutomationEdge{
			{ID: "e1", Source: "trigger", Target: "c1"},
			{ID: "e2", Source: "c1", Target: "a1", When: "true"},
		},
	}
}

func linearGraph(action models.IntegrationAction, cfg json.RawMessage) models.AutomationGraph {
	return models.AutomationGraph{
		Nodes: []models.AutomationNode{
			{ID: "trigger", Type: models.AutomationNodeTrigger},
			{ID: "a1", Type: models.AutomationNodeAction, Action: action, Config: cfg},
		},
		Edges: []models.AutomationEdge{{ID: "e1", Source: "trigger", Target: "a1"}},
	}
}
