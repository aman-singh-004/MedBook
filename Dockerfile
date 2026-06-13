# Stage 1: Build the application using Maven
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app

# Copy the pom.xml and source code
COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src

# Package the application
RUN mvn -f backend/pom.xml clean package -DskipTests

# Stage 2: Run the application
FROM openjdk:17-jdk-slim
WORKDIR /app

# Copy the generated JAR from the build stage
COPY --from=build /app/backend/target/booking-0.0.1-SNAPSHOT.jar app.jar

# Expose the server port
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
