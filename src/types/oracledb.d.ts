declare module 'oracledb' {
  export type BindParameters = Record<string, unknown>;

  export interface Connection {
    execute<T = unknown>(
      sql: string,
      binds?: BindParameters,
      options?: Record<string, unknown>,
    ): Promise<{
      rows?: T[];
      [key: string]: unknown;
    }>;
    close(): Promise<void>;
  }

  export const OUT_FORMAT_OBJECT: number;

  export function getConnection(options: {
    connectString: string;
    user: string;
    password: string;
  }): Promise<Connection>;
}
