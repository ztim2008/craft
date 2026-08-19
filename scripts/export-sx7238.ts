import { buildExportZip } from "@/modules/export/buildExport";

buildExportZip("1e600c9b-804c-4e03-87a5-e50bd5375044", "https://sx7238.craftum.io/")
  .then((p) => {
    console.log("ZIP", p);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
