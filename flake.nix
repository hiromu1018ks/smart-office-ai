{
  description = "Smart Office AI development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            gnumake
            docker-compose
            python3
            nodejs_20
            docker
            chromium  # For Playwright E2E tests on NixOS
          ];

          shellHook = ''
            echo "🚀 Smart Office AI development environment"
            echo "Run 'make up' to start containers"
            echo "For E2E tests: Make sure chromium is installed in your system"
            echo "Then: cd frontend && PLAYWRIGHT_CHROMIUM_PATH=/run/current-system/sw/bin/chromium npm run test:e2e"
          '';
        };
      }
    );
}
