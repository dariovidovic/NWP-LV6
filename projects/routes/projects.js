var express = require('express'),
router = express.Router(),
mongoose = require('mongoose'), 
bodyParser = require('body-parser'), 
methodOverride = require('method-override'); 
var Project = mongoose.model('Project');
var ProjectMembers = mongoose.model('ProjectMembers');

function formatDate(date) {
    return date ? date.toISOString().substring(0, 10) : '';
}

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        var method = req.body._method
        delete req.body._method
        return method
      }
}))

/*-----Ruta projects/new vraća new.jade view u kojemu je forma za unos podataka projekta-----*/
/*-----Unutar vecine ruta prosljeđuju se success i error poruke kako bi se korisniku dalo do znanja o rezultatu posta/puta-----*/
router.get('/projects/new', (req, res) => {
    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;

    req.session.successMessage = null;
    req.session.errorMessage = null;

    res.render('projects/new', { successMessage, errorMessage });
});

/*-----Dohvacanje svih projekata-----*/
router.get('/projects/allprojects', function(req, res, next) {
    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;

    req.session.successMessage = null;
    req.session.errorMessage = null;

    /*-----Dohvacaju se svi projekti iz kolekcije projects, nakon cega se traze korisnici koji pripadaju svakom od projekata-----*/
    /*-----Clanovi projekta se nalaze u kolekciji projectmembers unutar koje su spremljeni atributi: id projekta i ime korisnika na projektu-----*/

    Project.find({})
    .then(projects => {
        const promises = projects.map(project => {
            return ProjectMembers.find({ id_projekta: project._id })
                .then(members => {
                    project.members = members;
                    return project;
                });
        });

    /*-----Nakon sto se dohvate svi projekti, vrijednosti se prosljeđuju viewu allprojects.jade-----*/
    Promise.all(promises)
            .then(projectsWithMembers => {
                res.render('projects/allprojects', { projects: projectsWithMembers, successMessage, errorMessage });
            })
            .catch(err => {
                next(err);
            });

    
    })
    .catch(err => {
        next(err);
    });
});

/*-----Kada se klikne na edit button, otvara se edit view projekta pronađenog po njegovom id-u-----*/
router.get('/projects/:id/edit', function(req, res, next) {
    Project.findById(req.params.id)
        .then(project => {
            if (!project) {
                return res.status(404).send('Project not found.');
            }
            /*-----View-u se prosljeđuju podaci o projektu kako bi mogle biti prikazane trenutne vrijednosti projekta-----*/
            /*-----Prosljeđuje se i formatDate funkcija kako bi vrijednosti datuma iz kolekcije na input kalendara bile postavljene-----*/
            res.render('projects/edit', { project: project, formatDate });
        })
        .catch(err => {
            next(err);
        });
});

/*-----Dohvacanje projekta na temelju njegovog id-a-----*/
router.get('/projects/:id', function(req, res, next) {
    const projectId = req.params.id;

    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;

    req.session.successMessage = null;
    req.session.errorMessage = null;

    /*-----Ako se projekt ne moze naci, izbacuje se error poruka i vraca se na allprojects-----*/
    Project.findById(projectId)
        .then(project => {
            if (!project) {
                req.session.errorMessage = 'Project not found.';
                return res.redirect("/projects/allprojects");
            }
            
            /*-----Ukoliko je projekt pronadjen, vraca se show view s podacima trazenog projekta-----*/
            /*-----Dohvacaju se i clanovi tog projekta jer su u posebnoj kolekciji-----*/
            ProjectMembers.find({ id_projekta: projectId })
                .then(projectMembers => {
                    res.render('projects/show', { project: project, projectMembers: projectMembers, successMessage: successMessage, errorMessage: errorMessage });
                })
                .catch(err => {
                    console.error('Error fetching project members:', err);
                    req.session.errorMessage = 'Failed to fetch project members.';
                    res.redirect("/projects/allprojects");
                });
        })
        .catch(err => {
            console.error('Error fetching project:', err);
            req.session.errorMessage = 'Failed to fetch the project.';
            res.redirect("/projects/allprojects");
        });
});

/*-----Kada se klikne na dodaj projekt, pohranjuju se podaci u projects kolekciju te se ispisuje poruka ovisno o rezultatu operacije-----*/
router.post('/projects', (req, res) => {
    const { naziv_projekta, opis_projekta, cijena_projekta, obavljeni_poslovi, datum_pocetka, datum_zavrsetka } = req.body;
  
    mongoose.model('Project').create({
      naziv_projekta,
      opis_projekta,
      cijena_projekta,
      obavljeni_poslovi,
      datum_pocetka,
      datum_zavrsetka
    })
    .then(createdProject => {
      console.log('New project created:', createdProject);
      req.session.successMessage = 'Projekt je uspješno dodan.';
      res.redirect('/projects/new');
    })
    .catch(error => {
      console.error('Error saving project:', error);
      req.session.errorMessage = 'Failed to connect to the database.';
      res.redirect('/projects/new');
    });
  });

/*-----Kada se klikne na tipku delete, iz kolekcije projects brise se projekt predanog id-a-----*/
router.delete('/projects/:id', function(req, res) {
    Project.findOneAndDelete({ _id: req.params.id })
        .then(project => {
            if (!project) {
                console.error('Project not found.');
                req.session.errorMessage = 'Project not found.';
            } else {
                console.log('DELETE removing ID: ' + project._id);
                req.session.successMessage = 'Project successfully deleted.';
            }
            res.redirect("/projects/allprojects");
        })
        .catch(error => {
            console.error('Error deleting project:', error);
            req.session.errorMessage = 'Failed to delete the project.';
            res.redirect("/projects/allprojects");
        });
});

/*-----Kada korisnik klikne na tipku update, u kolekciji projects azuriraju se-----*/
/*-----vrijednosti koje korisnik zeli izmijeniti određenog projekta-----*/
router.put('/projects/:id', function(req, res) {
    const { naziv_projekta, opis_projekta, cijena_projekta, obavljeni_poslovi, datum_pocetka, datum_zavrsetka } = req.body;

    Project.findByIdAndUpdate(req.params.id, {
        naziv_projekta,
        opis_projekta,
        cijena_projekta,
        obavljeni_poslovi,
        datum_pocetka,
        datum_zavrsetka
    }, { new: true })
        .then(updatedProject => {
            if (!updatedProject) {
                return res.status(404).send('Project not found.');
            }
            res.format({
                html: function(){
                    req.session.successMessage = 'Project successfully updated.';
                    res.redirect("/projects/allprojects");
                },
                json: function(){
                    res.json(updatedProject);
                }
            });
        })
        .catch(error => {
            console.error('Error updating project:', error);
            req.session.errorMessage = 'Failed to update the project.';
            res.redirect("/projects/allprojects");
        });
});

/*-----Kada korisnik klikne na tipku Add Member otvara se forma za dodavanje clana na taj projekt-----*/
router.get('/projects/:id/add', function(req, res) {
    var projectId = req.params.id;
    res.render('projects/add', { projectId: projectId });
});

/*-----Dodavanje clana projektnog tima; potreban je i id projekta kako bi se novi korisnik spremio-----*/
/*-----u kolekciju projectmembers pod tocnim id-em projekta-----*/
router.post('/projects/:id/add', function(req, res) {
    var projectId = req.params.id;
    var userName = req.body.ime_korisnika;

    var ProjectMembers = mongoose.model('ProjectMembers');

    ProjectMembers.create({
        ime_korisnika: userName,
        id_projekta: projectId
    })
    .then(function(member) {
        console.log('New member added:', member);
        req.session.successMessage = 'Member successfully added to the project.';
        res.redirect(`/projects/${projectId}`);
    })
    .catch(function(error) {
        console.error('Error adding member:', error);
        req.session.errorMessage = 'Failed to add member to the project.';
        res.redirect(`/projects/${projectId}`);
    });
});


module.exports = router;