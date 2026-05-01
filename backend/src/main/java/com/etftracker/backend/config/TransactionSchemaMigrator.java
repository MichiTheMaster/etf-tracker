package com.etftracker.backend.config;

import com.etftracker.backend.entity.Transaction.TransactionType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;

@Component
public class TransactionSchemaMigrator implements CommandLineRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionSchemaMigrator.class);
    private static final int REQUIRED_TYPE_LENGTH = Math.max(32, Arrays.stream(TransactionType.values())
            .map(Enum::name)
            .mapToInt(String::length)
            .max()
            .orElse(16));

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    public TransactionSchemaMigrator(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            String databaseProduct = metaData.getDatabaseProductName();
            if (!isMysqlFamily(databaseProduct)) {
                return;
            }

            Integer currentLength = getTypeColumnLength(metaData);
            if (currentLength == null || currentLength >= REQUIRED_TYPE_LENGTH) {
                return;
            }

            jdbcTemplate.execute(
                    "ALTER TABLE transactions MODIFY COLUMN type VARCHAR(" + REQUIRED_TYPE_LENGTH + ") NOT NULL");
            LOGGER.info("Expanded transactions.type column from {} to {} characters", currentLength,
                    REQUIRED_TYPE_LENGTH);
        } catch (SQLException ex) {
            LOGGER.warn("Could not inspect or migrate transactions.type column", ex);
        }
    }

    private boolean isMysqlFamily(String databaseProduct) {
        if (databaseProduct == null) {
            return false;
        }
        String normalized = databaseProduct.toLowerCase();
        return normalized.contains("mysql") || normalized.contains("mariadb");
    }

    private Integer getTypeColumnLength(DatabaseMetaData metaData) throws SQLException {
        try (ResultSet columns = metaData.getColumns(null, null, "transactions", "type")) {
            if (columns.next()) {
                return columns.getInt("COLUMN_SIZE");
            }
        }

        try (ResultSet columns = metaData.getColumns(null, null, "TRANSACTIONS", "TYPE")) {
            if (columns.next()) {
                return columns.getInt("COLUMN_SIZE");
            }
        }

        return null;
    }
}