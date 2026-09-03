# Accounts without a birth date (AD-2)

`birthDate` is nullable at the database level: a real account created before this update keeps
an empty birth date, is neither suspended nor retroactively deleted, and is treated as an adult
by every public surface. Age verification (minimum 16 years old) applies to new job-seeker
registrations; recruiters are never asked for a birth date. No retroactive completion mechanism
is planned at this stage.

The demo/seed accounts are not exempt (brief §7.9.1): every seeded job-seeker carries a birth
date, and one fixture (17 years old) exists to show that a minor's profile stays out of the
public feed and public profile page while remaining visible in the role-gated recruiter
catalogue.
