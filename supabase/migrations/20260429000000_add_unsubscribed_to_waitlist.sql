alter table waitlist
  add column if not exists unsubscribed boolean not null default false;
