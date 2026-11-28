# Isolated DocuReady Lane B Evaluation Container (Tesseract 5.5.5)
# Base image pinned by immutable linux/amd64 SHA-256 digest
FROM python:3.12-slim-bookworm@sha256:1475c4f5b6bcb7d35e57661d6f5d7429ec4041275633c15f2b49350ac898276d AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    g++ \
    make \
    autoconf \
    automake \
    libtool \
    pkg-config \
    libleptonica-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libtiff-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Clone signed upstream tag 5.5.5 and verify exact commit SHA
WORKDIR /tmp/src
RUN git clone --depth 1 --branch 5.5.5 https://github.com/tesseract-ocr/tesseract.git \
    && cd tesseract \
    && test "$(git rev-parse HEAD)" = "4292f6890aa86ef64eba32090358f40f69dd6d28" \
    && ./autogen.sh \
    && ./configure \
    && make -j"$(nproc)" \
    && make install \
    && ldconfig

# Record exact builder dependency versions
RUN dpkg-query -W -f='${Package}=${Version}\n' libleptonica-dev g++ autoconf automake libtool pkg-config > /tmp/build_deps.txt

# Minimal hardened runtime stage
FROM python:3.12-slim-bookworm@sha256:1475c4f5b6bcb7d35e57661d6f5d7429ec4041275633c15f2b49350ac898276d

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    liblept5 \
    libpng16-16 \
    libjpeg62-turbo \
    libtiff6 \
    zlib1g \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    pytesseract==0.3.13 \
    pydantic==2.14.3 \
    pillow==13.0.0 \
    pymupdf==2.1 \
    pyyaml==6.0.4

COPY --from=builder /usr/local/bin/tesseract /usr/local/bin/tesseract
COPY --from=builder /usr/local/lib/libtesseract* /usr/local/lib/
COPY --from=builder /tmp/build_deps.txt /usr/local/share/doc/tesseract-build-deps.txt
COPY tessdata/eng.traineddata /usr/local/share/tessdata/eng.traineddata
COPY tessdata/hin.traineddata /usr/local/share/tessdata/hin.traineddata
COPY tessdata/ori.traineddata /usr/local/share/tessdata/ori.traineddata

RUN ldconfig \
    && groupadd -g 10001 evaluator \
    && useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin evaluator \
    && mkdir -p /workspace /output \
    && chown -R evaluator:evaluator /workspace /output

ENV DOCUREADY_TESSERACT_PATH=/usr/local/bin/tesseract
ENV TESSDATA_PREFIX=/usr/local/share/tessdata

USER evaluator
WORKDIR /workspace
