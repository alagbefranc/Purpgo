-- Modified by Purpgo LLC.
-- When this instance last mirrored the warmup settings Purpgo Cloud reported for the mailbox.
ALTER TABLE public.cloud_link_mailboxes
    ADD COLUMN settings_observed_at timestamptz;
