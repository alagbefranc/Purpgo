// Modified by Purpgo LLC.
// Command migrate applies all pending database migrations and exits.
//
// It runs the same embedded migrations the backend applies on boot, but
// without starting the API — handy after `make db-wipe` / `make db-reset`
// and in CI. The database URL comes from PRIMARY_DB (the make dev targets
// already export it).
package main

import (
	"log"
	"os"

	"github.com/purpgo/purpgo/internal/infrastructure/db"
)

func main() {
	url := os.Getenv("PRIMARY_DB")
	url, err := db.DirectEndpoint(url, os.Getenv("PRIMARY_DB_DIRECT"))
	if err != nil {
		log.Fatal(err)
	}
	if url == "" {
		log.Fatal("PRIMARY_DB is not set (e.g. postgres://purpgo:purpgo@localhost:15432/purpgo_dev?sslmode=disable)")
	}

	log.Println("Running database migrations...")
	if err := db.RunMigrations(url); err != nil {
		log.Fatal("Failed to run migrations: ", err)
	}
	log.Println("Database migrations completed")
}
