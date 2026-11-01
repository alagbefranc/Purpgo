// Modified by Purpgo LLC.
package worker

import (
	"context"

	"github.com/purpgo/purpgo/internal/infrastructure/kafka"
	"github.com/purpgo/purpgo/internal/models"
)

func (s *WorkerService) Produce(jobEventType models.JobEventType, key string, body any) error {
	ctx := context.Background()
	payload, err := s.Codec.Serialize(ctx, kafka.TopicWorkerEvents, &models.JobEvent{
		Type: jobEventType,
		Body: body,
	})
	if err != nil {
		return err
	}
	return s.Bus.Publish(ctx, kafka.TopicWorkerEvents, key, payload)
}
