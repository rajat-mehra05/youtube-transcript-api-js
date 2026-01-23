/**
 * Configuration for HTTP/HTTPS proxies
 */
export interface RequestsProxyConfig {
  http?: string | undefined;
  https?: string | undefined;
}

/**
 * Enhanced proxy configuration options for HTTP/HTTPS requests
 */
export interface ProxyOptions {
  /** Enable proxy for requests (default: false) */
  enabled: boolean;
  /** The HTTP proxy URL (e.g., 'http://user:pass@proxy.example.com:8080') */
  http?: string;
  /** The HTTPS proxy URL (e.g., 'http://user:pass@proxy.example.com:8080') */
  https?: string;
}

/**
 * Invidious configuration options for fallback when YouTube blocks requests
 */
export interface InvidiousOptions {
  /** Enable Invidious fallback (default: false) */
  enabled: boolean;
  /**
   * Invidious instance URL(s). Can be a single URL string or an array of URLs for fallback.
   * If an array is provided, instances will be tried in order until one works.
   */
  instanceUrls: string | string[];
  /** Timeout in milliseconds for Invidious requests (default: 10000) */
  timeout?: number;
}

/**
 * Base class for all proxy configurations
 */
export abstract class ProxyConfig {
  /**
   * Convert to requests-compatible proxy configuration
   */
  abstract toRequestsConfig(): RequestsProxyConfig;

  /**
   * Whether to prevent keeping connections alive (useful for rotating proxies)
   */
  get preventKeepingConnectionsAlive(): boolean {
    return false;
  }

  /**
   * Number of retries when blocked
   */
  get retriesWhenBlocked(): number {
    return 0;
  }
}

/**
 * Exception for invalid proxy configurations
 */
export class InvalidProxyConfig extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProxyConfig';
  }
}

/**
 * Generic proxy configuration for HTTP/HTTPS/SOCKS proxies
 */
export class GenericProxyConfig extends ProxyConfig {
  public readonly httpUrl: string | undefined;
  public readonly httpsUrl: string | undefined;

  constructor(httpUrl?: string, httpsUrl?: string) {
    super();
    
    if (!httpUrl && !httpsUrl) {
      throw new InvalidProxyConfig(
        'GenericProxyConfig requires you to define at least one of the two: http or https'
      );
    }
    
    this.httpUrl = httpUrl;
    this.httpsUrl = httpsUrl;
  }

  toRequestsConfig(): RequestsProxyConfig {
    const httpUrl = this.httpUrl || this.httpsUrl;
    const httpsUrl = this.httpsUrl || this.httpUrl;
    
    return {
      http: httpUrl!,
      https: httpsUrl!
    };
  }
}

/**
 * Enhanced proxy configuration using http-proxy-agent and https-proxy-agent
 */
export class EnhancedProxyConfig extends ProxyConfig {
  public readonly options: ProxyOptions;

  constructor(options: ProxyOptions) {
    super();
    
    if (options.enabled && !options.http && !options.https) {
      throw new InvalidProxyConfig(
        'EnhancedProxyConfig requires at least one of http or https URLs when enabled'
      );
    }
    
    this.options = options;
  }

  toRequestsConfig(): RequestsProxyConfig {
    if (!this.options.enabled) {
      return {};
    }

    return {
      http: this.options.http || undefined,
      https: this.options.https || this.options.http || undefined
    };
  }

  get preventKeepingConnectionsAlive(): boolean {
    return this.options.enabled;
  }

  get retriesWhenBlocked(): number {
    return 0;
  }
}

/**
 * Webshare proxy configuration for rotating residential proxies
 */
export class WebshareProxyConfig extends ProxyConfig {
  public readonly proxyUsername: string;
  public readonly proxyPassword: string;
  public readonly domainName: string;
  public readonly proxyPort: number;
  private readonly filterIpLocations: string[];
  private readonly _retriesWhenBlocked: number;

  private static readonly DEFAULT_DOMAIN_NAME = 'p.webshare.io';
  private static readonly DEFAULT_PORT = 80;

  constructor(
    proxyUsername: string,
    proxyPassword: string,
    filterIpLocations: string[] = [],
    retriesWhenBlocked: number = 10,
    domainName: string = WebshareProxyConfig.DEFAULT_DOMAIN_NAME,
    proxyPort: number = WebshareProxyConfig.DEFAULT_PORT
  ) {
    super();
    
    this.proxyUsername = proxyUsername;
    this.proxyPassword = proxyPassword;
    this.domainName = domainName;
    this.proxyPort = proxyPort;
    this.filterIpLocations = filterIpLocations;
    this._retriesWhenBlocked = retriesWhenBlocked;
  }

  get url(): string {
    const locationCodes = this.filterIpLocations
      .map(location => `-${location.toUpperCase()}`)
      .join('');
    
    return `http://${this.proxyUsername}${locationCodes}-rotate:${this.proxyPassword}@${this.domainName}:${this.proxyPort}/`;
  }

  toRequestsConfig(): RequestsProxyConfig {
    return {
      http: this.url,
      https: this.url
    };
  }

  get preventKeepingConnectionsAlive(): boolean {
    return true;
  }

  get retriesWhenBlocked(): number {
    return this._retriesWhenBlocked;
  }
}
