# Accounts without a birth date (AD-2)

`birthDate` is nullable at the database level: accounts created before this update (including
seed/demo accounts) keep an empty birth date and are neither suspended nor retroactively deleted.
Age verification (minimum 16 years old) applies only to new registrations; no retroactive
completion mechanism is planned at this stage.
