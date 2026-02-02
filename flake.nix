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
          ];

          shellHook = ''
            echo "🚀 Smart Office AI development environment"
            echo "Run 'make up' to start containers"
          '';
        };
      }
    );
}
