// Modified by Purpgo LLC.
package utils

import (
	"strconv"

	"github.com/purpgo/purpgo/internal/config"
	"github.com/purpgo/purpgo/internal/errx"
)

func ValidateLimit(limit string) (int32, *errx.Error) {
	i, err := strconv.ParseInt(limit, 10, 32)
	if err != nil || i > config.LimitMax || i < config.LimitMin {
		return 0, errx.ErrLimit
	}

	return int32(i), nil
}
