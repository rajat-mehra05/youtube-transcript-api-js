import {
  ProxyConfig,
  GenericProxyConfig,
  EnhancedProxyConfig,
  WebshareProxyConfig,
  InvalidProxyConfig
} from '../proxies';

describe('Proxy Configurations', () => {
  // ============================================
  // GenericProxyConfig
  // ============================================

  describe('GenericProxyConfig', () => {
    describe('constructor', () => {
      it('should create config with httpUrl only', () => {
        const config = new GenericProxyConfig('http://proxy.example.com:8080');

        expect(config.httpUrl).toBe('http://proxy.example.com:8080');
        expect(config.httpsUrl).toBeUndefined();
      });

      it('should create config with httpsUrl only', () => {
        const config = new GenericProxyConfig(undefined, 'https://proxy.example.com:8080');

        expect(config.httpUrl).toBeUndefined();
        expect(config.httpsUrl).toBe('https://proxy.example.com:8080');
      });

      it('should create config with both URLs', () => {
        const config = new GenericProxyConfig(
          'http://proxy.example.com:8080',
          'https://proxy.example.com:8443'
        );

        expect(config.httpUrl).toBe('http://proxy.example.com:8080');
        expect(config.httpsUrl).toBe('https://proxy.example.com:8443');
      });

      it('should throw InvalidProxyConfig when neither URL is provided', () => {
        expect(() => new GenericProxyConfig()).toThrow(InvalidProxyConfig);
        expect(() => new GenericProxyConfig(undefined, undefined)).toThrow(InvalidProxyConfig);
      });

      it('should throw error with descriptive message', () => {
        expect(() => new GenericProxyConfig()).toThrow(
          'GenericProxyConfig requires you to define at least one of the two: http or https'
        );
      });
    });

    describe('toRequestsConfig', () => {
      it('should return http and https using httpUrl when only httpUrl provided', () => {
        const config = new GenericProxyConfig('http://proxy.example.com:8080');
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig.http).toBe('http://proxy.example.com:8080');
        expect(requestsConfig.https).toBe('http://proxy.example.com:8080');
      });

      it('should return http and https using httpsUrl when only httpsUrl provided', () => {
        const config = new GenericProxyConfig(undefined, 'https://proxy.example.com:8443');
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig.http).toBe('https://proxy.example.com:8443');
        expect(requestsConfig.https).toBe('https://proxy.example.com:8443');
      });

      it('should return respective URLs when both are provided', () => {
        const config = new GenericProxyConfig(
          'http://proxy.example.com:8080',
          'https://proxy.example.com:8443'
        );
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig.http).toBe('http://proxy.example.com:8080');
        expect(requestsConfig.https).toBe('https://proxy.example.com:8443');
      });
    });

    describe('ProxyConfig base class properties', () => {
      it('should have preventKeepingConnectionsAlive return false', () => {
        const config = new GenericProxyConfig('http://proxy.example.com:8080');
        expect(config.preventKeepingConnectionsAlive).toBe(false);
      });

      it('should have retriesWhenBlocked return 0', () => {
        const config = new GenericProxyConfig('http://proxy.example.com:8080');
        expect(config.retriesWhenBlocked).toBe(0);
      });
    });
  });

  // ============================================
  // EnhancedProxyConfig
  // ============================================

  describe('EnhancedProxyConfig', () => {
    describe('constructor', () => {
      it('should create config with enabled=false without URLs', () => {
        const config = new EnhancedProxyConfig({ enabled: false });

        expect(config.options.enabled).toBe(false);
      });

      it('should create config with enabled=true and URLs', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          http: 'http://proxy.example.com:8080',
          https: 'https://proxy.example.com:8443'
        });

        expect(config.options.enabled).toBe(true);
        expect(config.options.http).toBe('http://proxy.example.com:8080');
        expect(config.options.https).toBe('https://proxy.example.com:8443');
      });

      it('should throw InvalidProxyConfig when enabled=true without URLs', () => {
        expect(() => new EnhancedProxyConfig({ enabled: true })).toThrow(InvalidProxyConfig);
      });

      it('should throw error with descriptive message when enabled without URLs', () => {
        expect(() => new EnhancedProxyConfig({ enabled: true })).toThrow(
          'EnhancedProxyConfig requires at least one of http or https URLs when enabled'
        );
      });

      it('should allow enabled=true with only http URL', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          http: 'http://proxy.example.com:8080'
        });

        expect(config.options.enabled).toBe(true);
        expect(config.options.http).toBe('http://proxy.example.com:8080');
      });

      it('should allow enabled=true with only https URL', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          https: 'https://proxy.example.com:8443'
        });

        expect(config.options.enabled).toBe(true);
        expect(config.options.https).toBe('https://proxy.example.com:8443');
      });
    });

    describe('toRequestsConfig', () => {
      it('should return empty object when disabled', () => {
        const config = new EnhancedProxyConfig({ enabled: false });
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig).toEqual({});
      });

      it('should return URLs when enabled', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          http: 'http://proxy.example.com:8080',
          https: 'https://proxy.example.com:8443'
        });
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig.http).toBe('http://proxy.example.com:8080');
        expect(requestsConfig.https).toBe('https://proxy.example.com:8443');
      });

      it('should fallback https to http when https not provided', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          http: 'http://proxy.example.com:8080'
        });
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig.http).toBe('http://proxy.example.com:8080');
        expect(requestsConfig.https).toBe('http://proxy.example.com:8080');
      });
    });

    describe('preventKeepingConnectionsAlive', () => {
      it('should return true when enabled', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          http: 'http://proxy.example.com:8080'
        });

        expect(config.preventKeepingConnectionsAlive).toBe(true);
      });

      it('should return false when disabled', () => {
        const config = new EnhancedProxyConfig({ enabled: false });

        expect(config.preventKeepingConnectionsAlive).toBe(false);
      });
    });

    describe('retriesWhenBlocked', () => {
      it('should return 0', () => {
        const config = new EnhancedProxyConfig({
          enabled: true,
          http: 'http://proxy.example.com:8080'
        });

        expect(config.retriesWhenBlocked).toBe(0);
      });
    });
  });

  // ============================================
  // WebshareProxyConfig
  // ============================================

  describe('WebshareProxyConfig', () => {
    describe('constructor', () => {
      it('should create config with required parameters', () => {
        const config = new WebshareProxyConfig('username', 'password');

        expect(config.proxyUsername).toBe('username');
        expect(config.proxyPassword).toBe('password');
      });

      it('should use default domain name and port', () => {
        const config = new WebshareProxyConfig('username', 'password');

        expect(config.domainName).toBe('p.webshare.io');
        expect(config.proxyPort).toBe(80);
      });

      it('should allow custom domain name and port', () => {
        const config = new WebshareProxyConfig(
          'username',
          'password',
          [],
          10,
          'custom.proxy.com',
          8080
        );

        expect(config.domainName).toBe('custom.proxy.com');
        expect(config.proxyPort).toBe(8080);
      });

      it('should store filterIpLocations', () => {
        const config = new WebshareProxyConfig('username', 'password', ['US', 'GB']);
        // Private property, tested via url getter
        expect(config.url).toContain('-US-GB');
      });

      it('should store custom retries value', () => {
        const config = new WebshareProxyConfig('username', 'password', [], 5);

        expect(config.retriesWhenBlocked).toBe(5);
      });

      it('should default retries to 10', () => {
        const config = new WebshareProxyConfig('username', 'password');

        expect(config.retriesWhenBlocked).toBe(10);
      });
    });

    describe('url getter', () => {
      it('should build URL without location codes', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass');

        expect(config.url).toBe('http://testuser-rotate:testpass@p.webshare.io:80/');
      });

      it('should include single location code in URL', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass', ['US']);

        expect(config.url).toBe('http://testuser-US-rotate:testpass@p.webshare.io:80/');
      });

      it('should include multiple location codes in URL', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass', ['US', 'GB', 'DE']);

        expect(config.url).toBe('http://testuser-US-GB-DE-rotate:testpass@p.webshare.io:80/');
      });

      it('should uppercase location codes', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass', ['us', 'gb']);

        expect(config.url).toContain('-US-GB-');
      });

      it('should use custom domain and port in URL', () => {
        const config = new WebshareProxyConfig(
          'testuser',
          'testpass',
          [],
          10,
          'custom.proxy.com',
          8080
        );

        expect(config.url).toBe('http://testuser-rotate:testpass@custom.proxy.com:8080/');
      });
    });

    describe('toRequestsConfig', () => {
      it('should return same URL for both http and https', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass');
        const requestsConfig = config.toRequestsConfig();

        expect(requestsConfig.http).toBe(config.url);
        expect(requestsConfig.https).toBe(config.url);
      });
    });

    describe('preventKeepingConnectionsAlive', () => {
      it('should return true (rotating proxy)', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass');

        expect(config.preventKeepingConnectionsAlive).toBe(true);
      });
    });

    describe('retriesWhenBlocked', () => {
      it('should return configured value', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass', [], 15);

        expect(config.retriesWhenBlocked).toBe(15);
      });

      it('should return default value (10)', () => {
        const config = new WebshareProxyConfig('testuser', 'testpass');

        expect(config.retriesWhenBlocked).toBe(10);
      });
    });
  });

  // ============================================
  // InvalidProxyConfig Exception
  // ============================================

  describe('InvalidProxyConfig', () => {
    it('should create error with message', () => {
      const error = new InvalidProxyConfig('Test error message');

      expect(error.message).toBe('Test error message');
    });

    it('should have correct name', () => {
      const error = new InvalidProxyConfig('Test');

      expect(error.name).toBe('InvalidProxyConfig');
    });

    it('should be an instance of Error', () => {
      const error = new InvalidProxyConfig('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ============================================
  // ProxyConfig Abstract Class
  // ============================================

  describe('ProxyConfig abstract class', () => {
    it('should be extended by GenericProxyConfig', () => {
      const config = new GenericProxyConfig('http://proxy.example.com');

      expect(config).toBeInstanceOf(ProxyConfig);
    });

    it('should be extended by EnhancedProxyConfig', () => {
      const config = new EnhancedProxyConfig({ enabled: false });

      expect(config).toBeInstanceOf(ProxyConfig);
    });

    it('should be extended by WebshareProxyConfig', () => {
      const config = new WebshareProxyConfig('user', 'pass');

      expect(config).toBeInstanceOf(ProxyConfig);
    });
  });
});
