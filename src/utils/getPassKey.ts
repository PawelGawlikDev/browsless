import SHA256 from 'crypto-js/sha256';
const PASS_SALT = 'browsless';
const getPassKey = (value: string) => {
  return SHA256(`${PASS_SALT}:${value}`).toString();
};
export default getPassKey;
