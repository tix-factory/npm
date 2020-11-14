// https://stackoverflow.com/a/2117523/1663648
import crypto from "crypto";
export default () =>  crypto.randomBytes(16).toString("hex");
