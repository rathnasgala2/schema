plugins {
    application
    java
}

group = "io.gala.schema"
version = "2.0.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.networknt:json-schema-validator:2.0.1")
    implementation("org.jruby.joni:joni:2.2.6")
    runtimeOnly("org.slf4j:slf4j-nop:2.0.17")
}

dependencyLocking {
    lockAllConfigurations()
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

application {
    mainClass = "io.gala.schema.parity.ParityMain"
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
}

tasks.named<JavaExec>("run") {
    standardInput = System.`in`
}

tasks.withType<AbstractArchiveTask>().configureEach {
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}
