"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { answerCards } from "@/data/answerCards";
import { promptCards } from "@/data/promptCards";
import { useState } from "react";

export default function VerCartas() {
  const [filtro, setFiltro] = useState<"todas" | "resposta" | "pergunta">(
    "todas"
  );
  const [busca, setBusca] = useState("");

  const todasCartas = [
    ...answerCards.map((text, i) => ({
      id: `a${i}`,
      texto: text,
      tipo: "resposta",
    })),
    ...promptCards.map((text, i) => ({
      id: `p${i}`,
      texto: text,
      tipo: "pergunta",
    })),
  ];

  const cartasFiltradas = todasCartas.filter((carta) => {
    const passaFiltro = filtro === "todas" || carta.tipo === filtro;
    const passaBusca = carta.texto.toLowerCase().includes(busca.toLowerCase());
    return passaFiltro && passaBusca;
  });

  return (
    <div className="min-h-screen bg-white mx-7 ">
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-md hover:bg-black/90 ml-4 mt-4"
      >
        <ArrowLeft size={20} />
        
      </Link>

      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Ver Cartas</h1>

        {/* Barra de pesquisa */}
        <div className="flex max-w-2xl mx-auto mb-6">
          <Input
            placeholder="Texto da carta..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rounded-r-none border-2 border-black focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <Button className="bg-black text-white hover:bg-black/90 rounded-l-none px-6 flex items-center gap-2">
            PESQUISAR <Search size={18} />
          </Button>
        </div>

        {/* Abas de navegação */}
        <div className="max-w-2xl mx-auto mb-4 flex border-2 border-black">
          <Button
            variant="ghost"
            onClick={() => setFiltro("todas")}
            className={`flex-1 rounded-none ${
              filtro === "todas"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            TODAS
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFiltro("resposta")}
            className={`flex-1 rounded-none ${
              filtro === "resposta"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            } border-l-2 border-black`}
          >
            RESPOSTAS
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFiltro("pergunta")}
            className={`flex-1 rounded-none ${
              filtro === "pergunta"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            } border-l-2 border-black`}
          >
            PERGUNTAS
          </Button>
        </div>

        {/* Contador de cartas */}
        <div className="max-w-2xl mx-auto mb-6 text-center">
          <p className="text-sm">Total de cartas: {cartasFiltradas.length}</p>
        </div>

        {/* Grade de cartas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3  mx-auto">
          {cartasFiltradas.map((carta) => (
            <div
              key={carta.id}
              className="aspect-[2/3] border-2 border-black rounded-md p-2 flex flex-col justify-between"
            >
              <div className="text-sm font-medium">{carta.texto}</div>
              <div className="flex items-center gap-1 mt-2">
                <div className="relative w-4 h-4">
                  <div className="absolute w-3 h-4 bg-white border border-black rotate-[-10deg]"></div>
                  <div className="absolute w-3 h-4 bg-black border border-black rotate-[5deg]"></div>
                </div>
                <span className="text-[8px]">Cards Just Cards</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
