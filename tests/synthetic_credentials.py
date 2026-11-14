"""Synthetic credentials of real shapes, built at run time for tests.

Restated from Kiro Crew's ``kiro_crew.testing.synthetic_credentials`` (the two
values these tests use). Kiro Crew's redactor keeps identifiers visible, the AWS
key ID and the AWS documentation example key among them, so a test that checks
redaction against the real gateway needs a credential it removes. Built here,
not written as literals, so no credential-shaped text lands in the repository.
"""

from __future__ import annotations

import string
import zlib

ALNUM = string.ascii_letters + string.digits
_BASE62 = string.digits + string.ascii_uppercase + string.ascii_lowercase
_GITHUB_CHECK_LEN = 6


def synth(n: int, alphabet: str = ALNUM, seed: int = 0) -> str:
    """A deterministic string of ``n`` characters that mixes the alphabet's classes."""
    step = 7 if len(alphabet) % 7 else 11
    return "".join(alphabet[(seed * 13 + i * step) % len(alphabet)] for i in range(n))


def base62_crc32(body: str) -> str:
    """The six-character base62 CRC32 a GitHub token appends to its body."""
    crc = zlib.crc32(body.encode("ascii"))
    digits = ""
    while crc:
        crc, rem = divmod(crc, 62)
        digits = _BASE62[rem] + digits
    return digits.rjust(_GITHUB_CHECK_LEN, "0")


def github_classic(prefix: str = "ghp_", seed: int = 1) -> str:
    """A GitHub classic token with a valid checksum."""
    body = synth(30, ALNUM, seed)
    return prefix + body + base62_crc32(body)


#: A 40-character AWS secret access key, fully synthetic (no documentation example
#: prefix), joined from pieces so no source line carries a whole credential.
SAMPLE_AWS_SECRET = "Qh4Tm2Vx9KpRc/Z8Nw3Hd/" + "Jf1Lb5Gs0Ye9Ua2WkE"
