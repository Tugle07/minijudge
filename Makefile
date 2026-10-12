CC      = gcc
CFLAGS  = -std=c11 -O2 -Wall -Wextra
INC     = -Icore/include

CORE_SRC    = $(wildcard core/src/*.c)
CORE_HDR    = $(wildcard core/include/*.h)
CONSOLE_SRC = $(wildcard console/*.c)
CONSOLE_HDR = $(wildcard console/*.h)
CLI_SRC     = cli/judge-cli.c

ifeq ($(OS),Windows_NT)
  EXE         = .exe
  MKDIR_BUILD = if not exist build mkdir build
  RM_BUILD    = if exist build rmdir /s /q build
else
  EXE         =
  CFLAGS     += -D_DEFAULT_SOURCE
  MKDIR_BUILD = mkdir -p build
  RM_BUILD    = rm -rf build
endif

CONSOLE_BIN = build/minijudge$(EXE)
CLI_BIN     = build/judge-cli$(EXE)

all: $(CONSOLE_BIN) $(CLI_BIN)

$(CONSOLE_BIN): $(CORE_SRC) $(CONSOLE_SRC) $(CORE_HDR) $(CONSOLE_HDR)
	@$(MKDIR_BUILD)
	$(CC) $(CFLAGS) $(INC) -Iconsole -o $@ $(CORE_SRC) $(CONSOLE_SRC)

$(CLI_BIN): $(CORE_SRC) $(CLI_SRC) $(CORE_HDR)
	@$(MKDIR_BUILD)
	$(CC) $(CFLAGS) $(INC) -o $@ $(CORE_SRC) $(CLI_SRC)

clean:
	@$(RM_BUILD)

.PHONY: all clean
