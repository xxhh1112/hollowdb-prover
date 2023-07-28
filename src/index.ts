import {createHash} from 'crypto';
import {poseidon1} from 'poseidon-lite/poseidon1';
const snarkjs = require('snarkjs');

const bn254Prime = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const TooLargeError = new Error('Preimage is larger than the order of scalar field of BN254.');

/** A zero-knowledge prover utility to be used with HollowDB.
 *
 * You will need to provide paths to a WASM circuit, and a prover key.
 * You can find these files [here](./circuits/) in the repository. it is up to you to decide where to place them for your application.
 * For example, in a web-app you may place under the `public` directory.
 *
 * You can also choose to provide the protocol, which defaults to Groth16.
 */
export class Prover {
  constructor(
    private readonly wasmPath: string,
    private readonly proverKeyPath: string,
    readonly protocol: 'groth16' | 'plonk' = 'groth16'
  ) {}

  /** Generate a zero-knowledge proof. */
  async prove(
    preimage: bigint,
    curValue: unknown,
    nextValue: unknown
  ): Promise<{proof: object; publicSignals: [curValueHash: string, nextValueHash: string, key: string]}> {
    if (preimage >= bn254Prime) {
      throw TooLargeError;
    }

    return await snarkjs[this.protocol].fullProve(
      {
        preimage: preimage,
        curValueHash: curValue ? hashToGroup(JSON.stringify(curValue)) : BigInt(0),
        nextValueHash: nextValue ? hashToGroup(JSON.stringify(nextValue)) : BigInt(0),
      },
      this.wasmPath,
      this.proverKeyPath
    );
  }
}

/** Given an input, SHA256 it and make sure the result is circuit-friendly. */
export function hashToGroup(input: string): bigint {
  const hexDigest = '0x' + createHash('sha256').update(Buffer.from(input)).digest('hex');

  return BigInt(hexDigest) % bn254Prime;
}

/** Compute the key that is the Poseidon hash of some preimage. */
export function computeKey(preimage: bigint): `0x${string}` {
  if (preimage >= bn254Prime) {
    throw TooLargeError;
  }

  return `0x${poseidon1([preimage]).toString(16)}`;
}
