package com.elemar.backendelemar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentDemandeService {

//    private final DocumentDemandeRepository documentDemandeRepository;
//    private final LotRepository lotRepository;
//    private final ChampAppreciationRepository champRepository;
//    private final LiaisonChampPieceRepository liaisonRepository;
//
//    @Transactional(readOnly = true)
//    public List<DocumentDemandeResponse> getAll() {
//        return documentDemandeRepository.findAllByOrderByOrdreAffichageAscIdAsc()
//                .stream()
//                .map(this::toResponse)
//                .toList();
//    }
//
//    @Transactional(readOnly = true)
//    public List<DocumentDemandeResponse> getActifs() {
//        return documentDemandeRepository.findByActifTrueOrderByOrdreAffichageAscIdAsc()
//                .stream()
//                .map(this::toResponse)
//                .toList();
//    }
//
//    @Transactional(readOnly = true)
//    public DocumentDemandeResponse getById(Long id) {
//        DocumentDemande document = documentDemandeRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Document demandé introuvable"));
//
//        return toResponse(document);
//    }
//
//    public DocumentDemandeResponse create(DocumentDemandeRequest request) {
//
//        documentDemandeRepository.findByCodeDocumentIgnoreCase(request.getCodeDocument())
//                .ifPresent(existing -> {
//                    throw new RuntimeException("Un document avec ce code existe déjà");
//                });
//
//        DocumentDemande document = new DocumentDemande();
//
//        applyRequestToEntity(request, document);
//
//        if (document.getOrdreAffichage() == null) {
//            Integer maxOrder = documentDemandeRepository.findMaxOrdreAffichage();
//
//            if (maxOrder == null) {
//                maxOrder = 0;
//            }
//
//            document.setOrdreAffichage(maxOrder + 1);
//        }
//
//        DocumentDemande saved = documentDemandeRepository.save(document);
//
//        replaceLinksForDocument(
//                saved,
//                request.getChampsLies() == null ? List.of() : request.getChampsLies()
//        );
//
//        return toResponse(saved);
//    }
//
//    public DocumentDemandeResponse update(Long id, DocumentDemandeRequest request) {
//
//        DocumentDemande document = documentDemandeRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Document demandé introuvable"));
//
//        documentDemandeRepository.findByCodeDocumentIgnoreCase(request.getCodeDocument())
//                .filter(existing -> !existing.getId().equals(id))
//                .ifPresent(existing -> {
//                    throw new RuntimeException("Un autre document avec ce code existe déjà");
//                });
//
//        applyRequestToEntity(request, document);
//
//        DocumentDemande saved = documentDemandeRepository.save(document);
//
//        // IMPORTANT : toujours remplacer les anciennes relations
//        replaceLinksForDocument(
//                saved,
//                request.getChampsLies() == null ? List.of() : request.getChampsLies()
//        );
//
//        return toResponse(saved);
//    }
//
//    public void deactivate(Long id) {
//        DocumentDemande document = documentDemandeRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Document demandé introuvable"));
//
//        document.setActif(false);
//
//        documentDemandeRepository.save(document);
//    }
//
//    public void delete(Long id) {
//        DocumentDemande document = documentDemandeRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Document demandé introuvable"));
//
//        liaisonRepository.deleteByDocumentDemandeId(id);
//
//        documentDemandeRepository.delete(document);
//    }
//
//    public DocumentDemandeResponse toggleActif(Long id) {
//        DocumentDemande document = documentDemandeRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Document demandé introuvable"));
//
//        document.setActif(!Boolean.TRUE.equals(document.getActif()));
//
//        DocumentDemande saved = documentDemandeRepository.save(document);
//
//        return toResponse(saved);
//    }
//
//    private void applyRequestToEntity(DocumentDemandeRequest request, DocumentDemande document) {
//
//        document.setCodeDocument(clean(request.getCodeDocument()));
//        document.setNomDocument(clean(request.getNomDocument()));
//
//        if (request.getPhase() == null) {
//            document.setPhase(PhaseDocument.PH1);
//        } else {
//            document.setPhase(request.getPhase());
//        }
//
//        document.setFormatAccepte(clean(request.getFormatAccepte()));
//        document.setObligatoire(Boolean.TRUE.equals(request.getObligatoire()));
//        document.setActif(request.getActif() == null || Boolean.TRUE.equals(request.getActif()));
//        document.setOrdreAffichage(request.getOrdreAffichage());
//
//        boolean applicableTousLots = Boolean.TRUE.equals(request.getApplicableTousLots());
//        document.setApplicableTousLots(applicableTousLots);
//
//        if (applicableTousLots) {
//            document.setApplicableA("Tous les lots");
//            document.setLot(null);
//        } else {
//            document.setApplicableA(convertLotsToString(request.getApplicableLots()));
//
//            if (request.getLotId() != null) {
//                Lot lot = lotRepository.findById(request.getLotId())
//                        .orElseThrow(() -> new RuntimeException("Lot introuvable"));
//
//                document.setLot(lot);
//            } else {
//                document.setLot(null);
//            }
//        }
//    }
//
//    private void replaceLinksForDocument(
//            DocumentDemande document,
//            List<LiaisonChampPieceRequest> links
//    ) {
//        liaisonRepository.deleteByDocumentDemandeId(document.getId());
//
//        if (links == null || links.isEmpty()) {
//            return;
//        }
//
//        int index = 1;
//
//        for (LiaisonChampPieceRequest linkRequest : links) {
//            if (linkRequest.getChampAppreciationId() == null) {
//                continue;
//            }
//
//            ChampAppreciation champ = champRepository.findById(linkRequest.getChampAppreciationId())
//                    .orElseThrow(() -> new RuntimeException("Champ d'appréciation introuvable"));
//
//            LiaisonChampPiece liaison = LiaisonChampPiece.builder()
//                    .champAppreciation(champ)
//                    .documentDemande(document)
//                    .obligatoire(linkRequest.getObligatoire() == null || Boolean.TRUE.equals(linkRequest.getObligatoire()))
//                    .conditionReponse(clean(linkRequest.getConditionReponse()))
//                    .messagePrestataire(clean(linkRequest.getMessagePrestataire()))
//                    .ordreAffichage(linkRequest.getOrdreAffichage() == null ? index : linkRequest.getOrdreAffichage())
//                    .actif(linkRequest.getActif() == null || Boolean.TRUE.equals(linkRequest.getActif()))
//                    .build();
//
//            liaisonRepository.save(liaison);
//
//            index++;
//        }
//    }
//
//    private DocumentDemandeResponse toResponse(DocumentDemande document) {
//
//        DocumentDemandeResponse response = new DocumentDemandeResponse();
//
//        response.setId(document.getId());
//        response.setCodeDocument(document.getCodeDocument());
//        response.setNomDocument(document.getNomDocument());
//        response.setPhase(document.getPhase());
//        response.setFormatAccepte(document.getFormatAccepte());
//        response.setObligatoire(document.getObligatoire());
//        response.setActif(document.getActif());
//        response.setOrdreAffichage(document.getOrdreAffichage());
//        response.setApplicableTousLots(document.getApplicableTousLots());
//        response.setApplicableA(document.getApplicableA());
//        response.setApplicableLots(convertStringToLots(document.getApplicableA()));
//
//        if (document.getLot() != null) {
//            response.setLotId(document.getLot().getId());
//            response.setNomLot(document.getLot().getNomLot());
//        }
//
//        response.setChampsLies(
//                liaisonRepository.findByDocumentDemandeIdWithDetails(document.getId())
//                        .stream()
//                        .map(this::toLiaisonResponse)
//                        .toList()
//        );
//
//        return response;
//    }
//
//    private LiaisonChampPieceResponse toLiaisonResponse(LiaisonChampPiece liaison) {
//        LiaisonChampPieceResponse response = new LiaisonChampPieceResponse();
//
//        response.setId(liaison.getId());
//        response.setObligatoire(liaison.getObligatoire());
//        response.setConditionReponse(liaison.getConditionReponse());
//        response.setMessagePrestataire(liaison.getMessagePrestataire());
//        response.setOrdreAffichage(liaison.getOrdreAffichage());
//        response.setActif(liaison.getActif());
//
//        if (liaison.getChampAppreciation() != null) {
//            response.setChampAppreciationId(liaison.getChampAppreciation().getId());
//            response.setLabelChamp(liaison.getChampAppreciation().getLabelChamp());
//            response.setCodePxx(liaison.getChampAppreciation().getCodePxx());
//
//            if (liaison.getChampAppreciation().getLot() != null) {
//                response.setLotId(liaison.getChampAppreciation().getLot().getId());
//                response.setLotNom(liaison.getChampAppreciation().getLot().getNomLot());
//            }
//        }
//
//        if (liaison.getDocumentDemande() != null) {
//            response.setDocumentDemandeId(liaison.getDocumentDemande().getId());
//            response.setCodeDocument(liaison.getDocumentDemande().getCodeDocument());
//            response.setNomDocument(liaison.getDocumentDemande().getNomDocument());
//        }
//
//        return response;
//    }
//
//    private String convertLotsToString(List<String> lots) {
//        if (lots == null || lots.isEmpty()) {
//            return "";
//        }
//
//        return String.join(",", lots);
//    }
//
//    private List<String> convertStringToLots(String value) {
//        if (value == null || value.isBlank()) {
//            return Collections.emptyList();
//        }
//
//        if ("Tous les lots".equalsIgnoreCase(value.trim())) {
//            return List.of("Tous les lots");
//        }
//
//        return Arrays.stream(value.split(","))
//                .map(String::trim)
//                .filter(item -> !item.isBlank())
//                .toList();
//    }
//
//    private String clean(String value) {
//        return value == null ? "" : value.trim();
//    }
}