// Veil — Sprint 1 spike guest.
//
// Trivial statement: "I know x such that x * x == 25."
//
// `x` (the secret root, e.g. 5) is a PRIVATE input written by the host over the
// executor channel — it never appears in the journal. The guest asserts the
// relation and commits only the PUBLIC value 25 to the journal. This exercises
// exactly the privacy pattern the real Veil model needs: a private witness in,
// a minimal public journal out.
//
// In Sprint 2 this guest is replaced by the prediction model:
//   private W + salt in, public { X-hash, C = Hash(Y, salt), image_id } out.
use risc0_zkvm::guest::env;

fn main() {
    // Private input: the secret root x. Never committed to the journal.
    let x: u64 = env::read();

    // The relation we are proving knowledge of a witness for.
    let square = x.checked_mul(x).expect("x * x overflowed u64");
    assert_eq!(square, 25, "witness does not satisfy x * x == 25");

    // Public journal output: only the public claim (25). x stays private.
    env::commit(&square);
}
