import ImportWizard from "../components/import/ImportWizard";

export default function ImportData() {
    return (
        <div className="min-h-screen p-4 md:p-8 bg-gray-50/50">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
                    <p className="text-gray-500 mt-1">Upload and import transactions from CSV files</p>
                </div>
                <ImportWizard />
            </div>
        </div>
    );
}