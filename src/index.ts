import fs from "node:fs/promises";
import { spawn } from "child_process";
import path from "node:path";
import axios from "axios";
import * as semver from "semver";

type UpdatePrefix = "^" | "~" | "";
type ResolvePackageInfo = {
  pkgName: string;
  latestVersion: string;
  currentVersion: string;
  needUpdate: boolean;
  isDep: boolean;
  updatePrefix: UpdatePrefix;
};

const updatePackage = async (packages: string[]) => {
  const execRoot = process.cwd();
  const targetPkgStr = await fs.readFile(
    path.join(execRoot, "/package.json"),
    "utf-8"
  );

  try {
    const targetPkg = JSON.parse(targetPkgStr);
    Promise.all<ResolvePackageInfo>(
      packages.map((pkg) => {
        return new Promise(async (resolve, reject) => {
          const latestVersion = await getLatestVersion(pkg);
          const isDep = pkg in targetPkg.dependencies;
          const currentVersionWithPrefix: string = isDep
            ? targetPkg.dependencies[pkg]
            : targetPkg.devDependencies[pkg];
          const updatePrefix = getUpdatePrefix(currentVersionWithPrefix);
          const currentVersion = updatePrefix
            ? currentVersionWithPrefix.slice(1)
            : currentVersionWithPrefix;
          const normalCurrentVersion = semver.coerce(currentVersion)?.version;

          const needUpdate = semver.gt(latestVersion, normalCurrentVersion!);
          resolve({
            pkgName: pkg,
            latestVersion,
            currentVersion,
            needUpdate,
            isDep,
            updatePrefix,
          });
        });
      })
    ).then(async (res) => {
      const updateDeps: string[] =
        res.filter((item) => item.needUpdate).map((item) => item.pkgName) || [];
      const pkgManage = await getPkgManage(execRoot);

      const depsCommand = getInstallCommand(updateDeps, pkgManage);

      if (depsCommand) {
        spawn(depsCommand, {
          shell: true,
          stdio: "inherit",
        });
      }
    });
  } catch (error) {
    console.log("项目package.json格式不对");
    process.exit(1);
  }
};

async function getLatestVersion(packageName: string): Promise<string> {
  const info = await axios.get(`https://registry.npmjs.org/${packageName}`);
  return info.data["dist-tags"].latest;
}

function getUpdatePrefix(packageName: string): UpdatePrefix {
  return packageName.startsWith("^")
    ? "^"
    : packageName.startsWith("~")
    ? "~"
    : "";
}

const pkgManageMap = {
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
  npm: "package-lock.json",
};
async function getPkgManage(execRoot: string) {
  const isPnpm = await exisFileOrFolder(
    path.resolve(execRoot, pkgManageMap.pnpm)
  );
  console.log("isPnpm", isPnpm);

  if (isPnpm) return "pnpm";

  const isYarn = await exisFileOrFolder(
    path.resolve(execRoot, pkgManageMap.yarn)
  );
  if (isYarn) return "yarn";

  const isNpm = await exisFileOrFolder(
    path.resolve(execRoot, pkgManageMap.npm)
  );
  if (isNpm) return "npm";

  return "npm";
}

async function exisFileOrFolder(path: string) {
  return fs
    .access(path, fs.constants.F_OK)
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

function getInstallCommand(packageNames: string[], pkgManage: string) {
  if (!packageNames.length) return "";

  let baseCommand = `${pkgManage} add`;
  let depsCommand = baseCommand;
  for (let i = 0; i < packageNames.length; i++) {
    depsCommand += ` ${packageNames[i]}@latest`;
  }

  return depsCommand;
}

export default updatePackage;
