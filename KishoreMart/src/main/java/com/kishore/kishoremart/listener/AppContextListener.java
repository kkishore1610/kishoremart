package com.kishore.kishoremart.listener;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@WebListener
public class AppContextListener implements ServletContextListener {

    private static final Logger LOG =
            LoggerFactory.getLogger(AppContextListener.class);

    public static final String DATASOURCE_ATTR = "kishoremart.datasource";

    private HikariDataSource dataSource;

    @Override
    public void contextInitialized(ServletContextEvent sce) {

        Properties props = loadConfig();

        String host = System.getenv("PGHOST");
        String port = System.getenv("PGPORT");
        String database = System.getenv("PGDATABASE");

        String username = System.getenv("PGUSER");
        String password = System.getenv("PGPASSWORD");

        String jdbcUrl;

        // Railway PostgreSQL
        if (host != null && !host.isBlank()
                && database != null && !database.isBlank()) {

            jdbcUrl = "jdbc:postgresql://"
                    + host + ":"
                    + (port == null || port.isBlank() ? "5432" : port)
                    + "/"
                    + database;

            LOG.info("Using Railway PostgreSQL database");
        } else {

            // Local development fallback
            jdbcUrl = props.getProperty(
                    "db.url",
                    "jdbc:h2:tcp://localhost:9092/./data/kishoremart"
            );

            if (username == null || username.isBlank()) {
                username = props.getProperty("db.user", "sa");
            }

            if (password == null) {
                password = props.getProperty("db.password", "");
            }

            LOG.info("Using local database configuration");
        }

        String driver = jdbcUrl.startsWith("jdbc:postgresql:")
                ? "org.postgresql.Driver"
                : "org.h2.Driver";

        HikariConfig config = new HikariConfig();

        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(driver);

        config.setMaximumPoolSize(
                Integer.parseInt(
                        props.getProperty("db.pool.maxSize", "10")
                )
        );

        config.setMinimumIdle(
                Integer.parseInt(
                        props.getProperty("db.pool.minIdle", "2")
                )
        );

        config.setPoolName("KishoreMartPool");

        this.dataSource = new HikariDataSource(config);

        sce.getServletContext().setAttribute(
                DATASOURCE_ATTR,
                dataSource
        );

        sce.getServletContext().setAttribute(
                ServiceRegistry.ATTR,
                new ServiceRegistry(dataSource)
        );

        LOG.info(
                "HikariCP pool initialized using {}",
                driver
        );
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {

        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            LOG.info("HikariCP pool closed");
        }
    }

    private Properties loadConfig() {

        Properties props = new Properties();

        try (
                InputStream in = getClass()
                        .getClassLoader()
                        .getResourceAsStream("config.properties")
        ) {

            if (in != null) {
                props.load(in);
            } else {
                LOG.warn(
                        "config.properties not found - using local defaults"
                );
            }

        } catch (IOException e) {

            LOG.error(
                    "Failed to read config.properties, using defaults",
                    e
            );
        }

        return props;
    }
}
