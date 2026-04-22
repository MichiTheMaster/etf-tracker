package com.etftracker.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String publicBaseUrl;
    private final Market market = new Market();
    private final EmailVerification emailVerification = new EmailVerification();
    private final PasswordReset passwordReset = new PasswordReset();
    private final Mail mail = new Mail();
    private final Privacy privacy = new Privacy();
    private final Logging logging = new Logging();
    private final Cors cors = new Cors();
    private final Cookie cookie = new Cookie();

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = publicBaseUrl;
    }

    public Market getMarket() {
        return market;
    }

    public EmailVerification getEmailVerification() {
        return emailVerification;
    }

    public PasswordReset getPasswordReset() {
        return passwordReset;
    }

    public Mail getMail() {
        return mail;
    }

    public Privacy getPrivacy() {
        return privacy;
    }

    public Logging getLogging() {
        return logging;
    }

    public Cors getCors() {
        return cors;
    }

    public Cookie getCookie() {
        return cookie;
    }

    public static class Market {

        private boolean fallbackPricesEnabled;

        public boolean isFallbackPricesEnabled() {
            return fallbackPricesEnabled;
        }

        public void setFallbackPricesEnabled(boolean fallbackPricesEnabled) {
            this.fallbackPricesEnabled = fallbackPricesEnabled;
        }
    }

    public static class EmailVerification {

        private boolean required;
        private long tokenValidHours;

        public boolean isRequired() {
            return required;
        }

        public void setRequired(boolean required) {
            this.required = required;
        }

        public long getTokenValidHours() {
            return tokenValidHours;
        }

        public void setTokenValidHours(long tokenValidHours) {
            this.tokenValidHours = tokenValidHours;
        }
    }

    public static class PasswordReset {

        private long tokenValidHours;

        public long getTokenValidHours() {
            return tokenValidHours;
        }

        public void setTokenValidHours(long tokenValidHours) {
            this.tokenValidHours = tokenValidHours;
        }
    }

    public static class Mail {

        private String from;

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }
    }

    public static class Privacy {

        private final IpTruncation ipTruncation = new IpTruncation();
        private final LogMasking logMasking = new LogMasking();

        public IpTruncation getIpTruncation() {
            return ipTruncation;
        }

        public LogMasking getLogMasking() {
            return logMasking;
        }

        public static class IpTruncation {

            private boolean enabled;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }
        }

        public static class LogMasking {

            private boolean enabled;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }
        }
    }

    public static class Logging {

        private final Retention audit = new Retention();
        private final Retention session = new Retention();

        public Retention getAudit() {
            return audit;
        }

        public Retention getSession() {
            return session;
        }

        public static class Retention {

            private int retentionDays;

            public int getRetentionDays() {
                return retentionDays;
            }

            public void setRetentionDays(int retentionDays) {
                this.retentionDays = retentionDays;
            }
        }
    }

    public static class Cors {

        private String allowedOriginPatterns;

        public String getAllowedOriginPatterns() {
            return allowedOriginPatterns;
        }

        public void setAllowedOriginPatterns(String allowedOriginPatterns) {
            this.allowedOriginPatterns = allowedOriginPatterns;
        }
    }

    public static class Cookie {

        private boolean secure;

        public boolean isSecure() {
            return secure;
        }

        public void setSecure(boolean secure) {
            this.secure = secure;
        }
    }
}