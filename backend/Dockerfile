FROM maven:3.9.11-eclipse-temurin-25 AS build
WORKDIR /app

COPY pom.xml ./
COPY src ./src

RUN mvn -q -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --uid 1001 --no-create-home app

COPY --from=build --chown=app:app /app/target/backend-0.0.1-SNAPSHOT.jar /app/backend.jar

USER app

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "/app/backend.jar"]
