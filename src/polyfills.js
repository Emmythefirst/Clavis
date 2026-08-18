// @tachibtc/taurus-vault-core (via bitcoinjs-lib) expects Node's Buffer
// global, which doesn't exist in the browser. Must be imported before
// anything that transitively pulls in that package — see main.jsx.
import { Buffer } from "buffer";

globalThis.Buffer = Buffer;
