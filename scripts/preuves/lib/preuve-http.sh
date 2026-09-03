#!/usr/bin/env bash
#
# Shared helpers for the docs/preuves/ curl-transcript scripts. Every one of
# them repeats the same five things — check the API is actually up, open the
# output file, print a header banner, safely quote the command it's about to
# show, then print that command followed by curl's raw output. Kept in one
# place so a new proof script reuses this instead of copy-pasting a version
# that quietly drifts from the others.
#
# Not runnable on its own — source it:
#   source "$(dirname "$0")/lib/preuve-http.sh"

set -euo pipefail

# Aborts with a clear message if the API isn't answering. A `curl -i` against
# a stopped server fails with a generic network error that isn't worth
# mistaking for a proof of anything.
preuve_verifier_api() {
  local api_url="$1"
  if ! curl -sSf -o /dev/null "$api_url/health"; then
    echo "API injoignable sur $api_url — démarrez-la avant de rejouer les preuves." >&2
    exit 1
  fi
}

# Truncates the output file and points `journal` (below) at it. Call this
# before anything else writes to the transcript.
preuve_init() {
  SORTIE="$1"
  : >"$SORTIE"
}

journal() { printf '%s\n' "$*" >>"$SORTIE"; }

# The banner every transcript opens with, so a reader can tell which commit
# and branch a capture came from without cross-referencing anything else.
preuve_entete() {
  local titre="$1" api_url="$2" racine="$3"
  journal "$titre"
  journal "ProfilsActifs — JEB/DNI/2026-003"
  journal ""
  journal "date        : $(date --iso-8601=seconds)"
  journal "commit      : $(git -C "$racine" rev-parse HEAD)"
  journal "branche     : $(git -C "$racine" rev-parse --abbrev-ref HEAD)"
  journal "API         : $api_url"
  journal "version API : $(curl -sS "$api_url/health" | jq -r '.version')"
}

# Renders one argument so the printed command stays copy-pasteable in a
# shell: quoted as soon as it carries anything but a safe character.
citer() {
  case "$1" in
  *[!A-Za-z0-9_/.:=@%+-]*) printf "'%s'" "${1//\'/\'\\''}" ;;
  *) printf '%s' "$1" ;;
  esac
}

# Prints the curl command as it will run, then appends its raw `-i` output
# to the transcript — never a hand-recomposed response. Any argument that
# literally contains `$TOKEN_CANDIDAT` is printed as that placeholder (the
# bearer token itself never appears in the transcript) but substituted with
# the real value from the caller's $TOKEN_CANDIDAT before the request is
# sent. `attendu` may be empty — pass "" to skip that line.
preuve_capture() {
  local titre="$1" attendu="$2"
  shift 2

  local commande="curl -i" argument
  for argument in "$@"; do
    commande+=" $(citer "$argument")"
  done

  journal ""
  journal "=============================================================================="
  journal "$titre"
  if [ -n "$attendu" ]; then
    journal "attendu : $attendu"
  fi
  journal "------------------------------------------------------------------------------"
  journal "\$ $commande"
  journal ""

  local rendu=("$@") index
  if [ -n "${TOKEN_CANDIDAT:-}" ]; then
    for index in "${!rendu[@]}"; do
      rendu[index]="${rendu[index]//\$TOKEN_CANDIDAT/$TOKEN_CANDIDAT}"
    done
  fi

  curl -sS -i "${rendu[@]}" >>"$SORTIE"
  journal ""
}
