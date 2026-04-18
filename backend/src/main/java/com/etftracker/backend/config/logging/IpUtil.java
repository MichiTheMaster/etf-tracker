package com.etftracker.backend.config.logging;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;

/**
 * Utility for privacy-preserving IP address truncation.
 * IPv4: zeros the last octet (1.2.3.4 → 1.2.3.0/24).
 * IPv6: zeros the last 64 bits, keeping the /64 prefix (2001:db8::1 →
 * 2001:db8::/64).
 */
public final class IpUtil {

    private IpUtil() {
    }

    public static String truncate(String ip) {
        if (ip == null || ip.isBlank()) {
            return ip;
        }
        try {
            InetAddress addr = InetAddress.getByName(ip.trim());
            if (addr instanceof Inet4Address) {
                byte[] b = addr.getAddress();
                b[3] = 0;
                return InetAddress.getByAddress(b).getHostAddress() + "/24";
            } else if (addr instanceof Inet6Address) {
                byte[] b = addr.getAddress();
                for (int i = 8; i < 16; i++) {
                    b[i] = 0;
                }
                return InetAddress.getByAddress(b).getHostAddress() + "/64";
            }
        } catch (Exception ignored) {
            // unparseable address: return as-is
        }
        return ip;
    }
}
