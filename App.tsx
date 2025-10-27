import React, { useState, useCallback } from 'react';
// Importando as bibliotecas como módulos ES para garantir o carregamento
import Papa from 'https://esm.sh/papaparse@5.4.1';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { UploadCloud, MapPin, Calendar, Download, LoaderCircle, AlertCircle } from './components/icons';

interface ProcessResult {
  url: string;
  fileName: string;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].type === 'text/csv' || e.target.files[0].name.endsWith('.csv')) {
        setFile(e.target.files[0]);
      } else {
        setError('Por favor, selecione um arquivo .csv válido.');
        setFile(null);
      }
    }
  };

  const processAndConvertFile = useCallback(async (csvFile: File, collectionLocation: string, date: string): Promise<ProcessResult> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvFile, {
        complete: (results: any) => {
          try {
            const originalData: (string|number)[][] = results.data;

            if (!originalData || originalData.length === 0 || originalData[0].length === 0) {
              return reject(new Error("O arquivo CSV está vazio ou é inválido."));
            }

            const [year, month, day] = date.split('-');
            if (!year || !month || !day) {
              return reject(new Error("Formato de data inválido. Use o seletor de data."));
            }
            const formattedDateForColumn = `${day}/${month}/${year}`;
            const formattedDateForFile = `${day}-${month}-${year}`;
            
            const headerRow = [...originalData[0]];
            headerRow.splice(3, 0, 'data'); // Insere 'data' na coluna D (índice 3)
            
            const newData = [headerRow];

            for (let i = 1; i < originalData.length; i++) {
              const row = originalData[i];
               if (row.some(cell => cell && String(cell).trim() !== '')) {
                 // Converte células que parecem números para o tipo Number
                 const newRow = row.map(cell => {
                   const trimmedCell = typeof cell === 'string' ? cell.trim() : cell;
                   if (trimmedCell === null || trimmedCell === '') {
                     return trimmedCell;
                   }
                   // Converte para tipo numérico para que o Excel o reconheça como número
                   if (typeof trimmedCell === 'string' && /^-?\d+(\.\d+)?$/.test(trimmedCell)) {
                     return parseFloat(trimmedCell);
                   }
                   return trimmedCell;
                 });
                 newRow.splice(3, 0, formattedDateForColumn); // Insere a data na coluna D (índice 3)
                 newData.push(newRow);
               }
            }

            if (newData.length <= 1) {
                return reject(new Error("O CSV não contém linhas de dados para processar."));
            }

            const worksheet = XLSX.utils.aoa_to_sheet(newData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Coleta');

            const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([xlsxBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const fileName = `coleta da ${collectionLocation} no dia ${formattedDateForFile}.xlsx`;

            resolve({ url, fileName });
          } catch (e: any) {
            console.error("Erro durante o processamento do arquivo:", e);
            reject(new Error(`Ocorreu um erro ao processar o arquivo: ${e.message}`));
          }
        },
        error: (err: any) => {
          console.error("Erro de parsing do CSV:", err);
          reject(new Error("Falha ao ler o arquivo CSV. Verifique se o formato está correto."));
        },
        skipEmptyLines: true,
      });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!file || !location || !collectionDate) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const processResult = await processAndConvertFile(file, location, collectionDate);
      setResult(processResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = file && location && collectionDate;
  const isButtonDisabled = !isFormValid || isLoading;

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
          Processando...
        </>
      );
    }
    return 'Converter e Gerar Arquivo';
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 font-sans">
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-8 transition-all duration-300">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Conversor de Dados de Coleta</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Envie seu CSV e adicione informações de coleta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">1. Arquivo de Coleta (.csv)</label>
            <label htmlFor="file-upload" className="group cursor-pointer flex justify-center w-full px-6 py-10 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg transition hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition"/>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Clique para enviar</span> ou arraste e solte
                </p>
                {file ? (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{file.name}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Apenas arquivos .csv</p>
                )}
              </div>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
            </label>
          </div>

          <div className="relative">
             <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Local da Coleta</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-8">
                <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="location"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            >
              <option value="" disabled>Selecione um local</option>
              <option value="Escola">Escola</option>
              <option value="Esquina">Esquina</option>
              <option value="Arena">Arena</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 pt-8 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative">
             <label htmlFor="collectionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">3. Data da Coleta</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-8">
                <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="collectionDate"
              type="date"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 transition-colors"
            >
              {getButtonContent()}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center space-y-4">
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Arquivo Processado com Sucesso!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 break-words">Seu arquivo <span className="font-semibold">{result.fileName}</span> está pronto.</p>
            <a
              href={result.url}
              download={result.fileName}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Download className="-ml-1 mr-3 h-5 w-5" />
              Baixar Arquivo .xlsx
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
