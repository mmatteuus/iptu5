import Layout from "./Layout.jsx";

import Home from "./Home";

import Debitos from "./Debitos";

import Simulacao from "./Simulacao";

import DetalhesImovel from "./DetalhesImovel";

import StatusPagamentos from "./StatusPagamentos";

import Master from "./Master";

import UserSettings from "./UserSettings";

import MonitoramentoAPI from "./MonitoramentoAPI";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Debitos: Debitos,
    
    Simulacao: Simulacao,
    
    DetalhesImovel: DetalhesImovel,
    
    StatusPagamentos: StatusPagamentos,
    
    Master: Master,
    
    UserSettings: UserSettings,
    
    MonitoramentoAPI: MonitoramentoAPI,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Debitos" element={<Debitos />} />
                
                <Route path="/Simulacao" element={<Simulacao />} />
                
                <Route path="/DetalhesImovel" element={<DetalhesImovel />} />
                
                <Route path="/StatusPagamentos" element={<StatusPagamentos />} />
                
                <Route path="/Master" element={<Master />} />
                
                <Route path="/UserSettings" element={<UserSettings />} />
                
                <Route path="/MonitoramentoAPI" element={<MonitoramentoAPI />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}