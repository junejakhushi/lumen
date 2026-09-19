declare module "argon2" {
  export function hash(
    plain: string | Buffer,
    options?: Record<string, unknown>
  ): Promise<string>;
  export function verify(
    hash: string,
    plain: string | Buffer
  ): Promise<boolean>;
}
