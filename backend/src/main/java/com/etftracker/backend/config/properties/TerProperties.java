package com.etftracker.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ter")
public class TerProperties {

    private final Fallback fallback = new Fallback();
    private final AutoUpdate autoupdate = new AutoUpdate();

    public Fallback getFallback() {
        return fallback;
    }

    public AutoUpdate getAutoupdate() {
        return autoupdate;
    }

    public static class Fallback {

        private String file;

        public String getFile() {
            return file;
        }

        public void setFile(String file) {
            this.file = file;
        }
    }

    public static class AutoUpdate {

        private String cron;
        private long fixedDelayMs;
        private long fixedInitialDelayMs;

        public String getCron() {
            return cron;
        }

        public void setCron(String cron) {
            this.cron = cron;
        }

        public long getFixedDelayMs() {
            return fixedDelayMs;
        }

        public void setFixedDelayMs(long fixedDelayMs) {
            this.fixedDelayMs = fixedDelayMs;
        }

        public long getFixedInitialDelayMs() {
            return fixedInitialDelayMs;
        }

        public void setFixedInitialDelayMs(long fixedInitialDelayMs) {
            this.fixedInitialDelayMs = fixedInitialDelayMs;
        }
    }
}